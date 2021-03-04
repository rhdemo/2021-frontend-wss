import log from '@app/log';
import * as matchmaking from '@app/stores/matchmaking';
import * as players from '@app/stores/players';
import { GameState } from '@app/models/game.configuration';
import * as ce from '@app/cloud-events/send';
import { isGameOverForPlayer } from '@app/game';
import { MessageHandler } from './common';
import { AttackDataPayload } from '@app/payloads/incoming';
import {
  OutgoingMsgType,
  ValidationErrorPayload
} from '@app/payloads/outgoing';
import PlayerConfiguration, {
  PlayerConfigurationData
} from '@app/models/player.configuration';
import * as ml from '@app/ml';
import { AttackResult } from '@app/payloads/common';
import { getSocketDataContainerByPlayerUUID } from './player.sockets';
import PlayerSocketDataContainer from './player.socket.container';
import { getPlayerSpecificData } from './common';

type AttackResponse = {
  // UUID of the player that performed the attack
  attacker: string;
  result: AttackResult;
};

type MergedAttackReponse = AttackResponse & PlayerConfigurationData;

const attackHandler: MessageHandler<
  AttackDataPayload,
  MergedAttackReponse | ValidationErrorPayload
> = async (container: PlayerSocketDataContainer, attack: AttackDataPayload) => {
  const info = container.getPlayerInfo();

  if (!info) {
    throw new Error('failed to find player associated with this websocket');
  }

  // Despite the fact a player is associated with a socket, we always
  // use the cache as a source of truth. The socket is a lookup reference
  const player = await players.getPlayerWithUUID(info.uuid);
  if (!player) {
    throw new Error('failed to find player data');
  }

  const { game, opponent, match } = await getPlayerSpecificData(player);

  if (!game.isInState(GameState.Active)) {
    throw new Error(
      `player ${player.getUUID()} cannot attack when game state is "${game.getGameState()}"`
    );
  }

  if (!match) {
    throw new Error(
      `failed to find match associated with player ${player.getUUID()}`
    );
  }

  if (!match.isPlayerTurn(player)) {
    throw new Error(
      `player ${player.getUUID()} attempted to attack, but it's not their turn`
    );
  }

  if (!match.isReady()) {
    throw new Error(
      `player ${player.getUUID()} attempted an attack, but match instance is not ready`
    );
  }

  if (!opponent) {
    throw new Error(
      `no opponent was found in attack handler for player ${player.getUUID()}`
    );
  }

  if (player.hasAttackedLocation(attack.origin)) {
    return {
      type: OutgoingMsgType.BadAttack,
      data: {
        info: `location ${attack.origin.join(',')} has already been attacked`
      }
    };
  }

  if (!player.isAiPlayer() && attack.prediction) {
    return {
      type: OutgoingMsgType.BadPayload,
      data: {
        info: `"prediction" key not allowed in data payload`
      }
    };
  }

  log.info(
    `determine player ${player.getUUID()} attack hit/miss vs ${opponent.getUUID()}. Attack data %j`,
    attack
  );

  const attackResult: AttackResult = opponent.determineAttackResult(attack);

  if (attackResult.hit) {
    log.info(
      `player ${player.getUUID()} hit ${
        attackResult.type
      } of opponent ${opponent.getUUID()} at %j`,
      attack.origin
    );

    // Send a hit cloud event
    ce.hit({
      by: player.getUUID(),
      game: game.getUUID(),
      human: !player.isAiPlayer(),
      against: opponent.getUUID(),
      origin: `${attack.origin[0]},${attack.origin[1]}` as const,
      ts: Date.now(),
      consecutiveHitsCount: player.getContinuousHitsCount(),
      shotCount: player.getShotsFiredCount(),
      match: match.getUUID(),
      type: attackResult.type
    });

    if (attackResult.destroyed) {
      // Send a sink cloud event when a ship has been destroyed
      ce.sink({
        by: player.getUUID(),
        game: game.getUUID(),
        human: !player.isAiPlayer(),
        against: opponent.getUUID(),
        consecutiveHitsCount: player.getContinuousHitsCount(),
        shotCount: player.getShotsFiredCount(),
        ts: Date.now(),
        type: attackResult.type,
        match: match.getUUID(),
        origin: `${attack.origin[0]},${attack.origin[1]}` as const
      });
    }
  } else {
    log.info(
      `player ${player.getUUID()} attack %j did not hit opponent ${opponent.getUUID()} ships`,
      attack.origin
    );

    ce.miss({
      by: player.getUUID(),
      game: game.getUUID(),
      human: !player.isAiPlayer(),
      consecutiveHitsCount: player.getContinuousHitsCount(),
      shotCount: player.getShotsFiredCount(),
      against: opponent.getUUID(),
      origin: `${attack.origin[0]},${attack.origin[1]}` as const,
      ts: Date.now(),
      match: match.getUUID()
    });
  }

  // Record the attack result in the attacking players state
  player.recordAttackResult(attack, attackResult);

  // Save both updated player objects to cache
  await Promise.all([
    players.upsertPlayerInCache(player),
    players.upsertPlayerInCache(opponent)
  ]);

  if (isGameOverForPlayer(opponent)) {
    log.info(
      `determined that player ${player.getUUID()} lost match ${match.getUUID}`
    );

    // The opponent's ships have all been hit. This player is the winner!
    match.setWinner(player);

    // Send win and lose Cloud Events
    const isWinnerHuman = !player.isAiPlayer();
    ce.win({
      game: game.getUUID(),
      match: match.getUUID(),
      human: isWinnerHuman,
      player: player.getUUID(),
      shotCount: player.getShotsFiredCount()
    });
    ce.lose({
      game: game.getUUID(),
      match: match.getUUID(),
      human: !isWinnerHuman,
      player: opponent.getUUID(),
      shotCount: opponent.getShotsFiredCount()
    });

    // Write payload to storage for analysis by ML services
    ml.writeGameRecord(player, opponent, match, game);
  } else {
    // Change turns so the player that just received an attack can retaliate
    match.changeTurn();
  }

  await matchmaking.upsertMatchInCache(match);

  // If the opponent is connected, update with attack results too
  // If they're not connected they'll get updated on reconnect
  const opponentSocket = getSocketDataContainerByPlayerUUID(opponent.getUUID());
  if (opponentSocket) {
    opponentSocket.send({
      type: OutgoingMsgType.AttackResult,
      data: {
        result: attackResult,
        attacker: player.getUUID(),
        ...new PlayerConfiguration(game, opponent, match, player).toJSON()
      }
    });
  }

  // Return the attack result to the player
  return {
    type: OutgoingMsgType.AttackResult,
    data: {
      result: attackResult,
      attacker: player.getUUID(),
      ...new PlayerConfiguration(game, player, match, opponent).toJSON()
    }
  };
};

export default attackHandler;
