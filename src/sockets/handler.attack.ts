import WebSocket from 'ws';
import log from '@app/log';
import * as matchmaking from '@app/stores/matchmaking';
import * as players from '@app/stores/players';
import { GameState } from '@app/models/game.configuration';
import * as ce from '@app/cloud-events';
import { CellPosition, ShipType } from '@app/game/types';
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
import { getPlayerSpecificData, send } from './common';
import * as ml from '@app/ml';
import { AttackPayloadSchema } from '@app/payloads/schemas';

export type AttackResult = {
  origin: CellPosition;
  hit: boolean;
  destroyed?: boolean;
  type?: ShipType;
};

type AttackResponse = {
  // UUID of the player that performed the attack
  attacker: string;
  result: AttackResult[];
};

type MergedAttackReponse = AttackResponse & PlayerConfigurationData;

const attackHandler: MessageHandler<
  MergedAttackReponse | ValidationErrorPayload
> = async (ws: WebSocket, data: unknown) => {
  log.debug('processing attack payload: %j', data);
  const validatedData = AttackPayloadSchema.validate(data);

  if (validatedData.error) {
    return {
      type: OutgoingMsgType.BadPayload,
      data: {
        info: validatedData.error.toString()
      }
    };
  } else {
    const wsPlayer = players.getPlayerAssociatedWithSocket(ws);

    if (!wsPlayer) {
      throw new Error('failed to find player associated with this websocket');
    }

    // Despite the fact a player is associated with a socket, we always
    // use the cache as a source of truth. The socket is a lookup reference
    const player = await players.getPlayerWithUUID(wsPlayer.getUUID());
    if (!player) {
      throw new Error('failed to find player data');
    }

    const { game, opponent, match } = await getPlayerSpecificData(player);

    if (game.getGameState() !== GameState.Active) {
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

    const opponentShipData = opponent.getShipPositionData();
    if (!opponentShipData) {
      throw new Error(
        `player ${player.getUUID()} opponent (${opponent.getUUID()}) was missing ship position data`
      );
    }

    const attack = validatedData.value as AttackDataPayload;
    let attackResult: AttackResult = {
      origin: attack.origin,
      hit: false,
      destroyed: false
    };

    log.debug(`determine player ${player.getUUID()} attack hit/miss`);
    log.debug('attack data: %j', attack);

    for (let _ship in opponentShipData) {
      if (attackResult.hit) {
        // If a hit was registered, then break the loop
        break;
      }

      const ship = opponentShipData[_ship as ShipType];
      log.trace(`checking attack %j hit vs ${_ship} cells`, attack.origin);

      const hitCell = ship.cells.find((c) => {
        return (
          attack.origin[0] === c.origin[0] && attack.origin[1] === c.origin[1]
        );
      });

      if (hitCell) {
        // Mark the cell as hit in both the main record, and attack result
        hitCell.hit = attackResult.hit = true;
        attackResult.type = ship.type;

        // Determine if the ship is destroyed
        attackResult.destroyed = ship.cells.reduce((_destroyed: boolean, v) => {
          return _destroyed && v.hit;
        }, true);
      } else {
        log.trace(`attack did not hit any cells of ${_ship}`);
      }
    }

    log.debug(`player ${player.getUUID()} attack result: %j`, attackResult);

    if (attackResult.hit) {
      // Send a hit cloud event
      ce.hit({
        by: player.getUUID(),
        game: game.getUUID(),
        against: opponent.getUUID(),
        origin: `${attackResult.origin[0]},${attackResult.origin[1]}` as const,
        ts: Date.now(),
        match: match.getUUID(),
        type: attackResult.type as ShipType
      });
    } else {
      ce.miss({
        by: player.getUUID(),
        game: game.getUUID(),
        against: opponent.getUUID(),
        origin: `${attackResult.origin[0]},${attackResult.origin[1]}` as const,
        ts: Date.now(),
        match: match.getUUID()
      });
    }

    if (attackResult.destroyed && attackResult.type) {
      // Send a sink cloud event
      ce.sink({
        by: player.getUUID(),
        game: game.getUUID(),
        against: opponent.getUUID(),
        ts: Date.now(),
        type: attackResult.type,
        match: match.getUUID(),
        origin: `${attackResult.origin[0]},${attackResult.origin[1]}` as const
      });
    }

    // Make a record of the attack in the attacking player's record
    player.recordAttack(attack, [attackResult]);

    // Change who's turn it is next
    match.changeTurn();

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
      ce.win({
        game: game.getUUID(),
        match: match.getUUID(),
        player: player.getUUID()
      });
      ce.lose({
        game: game.getUUID(),
        match: match.getUUID(),
        player: opponent.getUUID()
      });

      // Write payload to storage for analysis by ML services
      ml.writeGameRecord(player, opponent, match, game);
    }

    await matchmaking.upsertMatchInCache(match);

    // If the opponent is connected, update with attack results too
    // If they're not connected they'll get updated on reconnect
    const opponentSocket = players.getSocketForPlayer(opponent);
    if (opponentSocket) {
      send(opponentSocket, {
        type: OutgoingMsgType.AttackResult,
        data: {
          result: [attackResult],
          attacker: player.getUUID(),
          ...new PlayerConfiguration(game, opponent, match, player).toJSON()
        }
      });
    }

    // Return the attack result to the player
    return {
      type: OutgoingMsgType.AttackResult,
      data: {
        result: [attackResult],
        attacker: player.getUUID(),
        ...new PlayerConfiguration(game, player, match, opponent).toJSON()
      }
    };
  }
};

export default attackHandler;
