import { GameState } from '@app/models/game.configuration';
import { MessageHandler } from './common';
import { BonusDataPayload } from '@app/payloads/incoming';
import {
  OutgoingMsgType,
  ValidationErrorPayload
} from '@app/payloads/outgoing';
import PlayerConfiguration, {
  PlayerConfigurationData
} from '@app/models/player.configuration';
import { getSocketDataContainerByPlayerUUID } from './player.sockets';
import PlayerSocketDataContainer from './player.socket.container';
import { getPlayerSpecificData } from './common';
import { upsertMatchInCache } from '@app/stores/matchmaking';
import log from '@app/log';
import { MatchPhase } from '@app/models/match.instance';

const bonusHandler: MessageHandler<
  BonusDataPayload,
  PlayerConfigurationData | ValidationErrorPayload
> = async (container: PlayerSocketDataContainer, bonus) => {
  const basePlayer = container.getPlayer();

  if (!basePlayer) {
    throw new Error('no player associated with websocket for bonus');
  }

  const { game, opponent, match, player } = await getPlayerSpecificData(
    basePlayer
  );

  if (!game.isInState(GameState.Active)) {
    throw new Error(
      `player ${player.getUUID()} cannot send bonus payload when game state is "${game.getGameState()}"`
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

  if (!match.isInPhase(MatchPhase.Bonus)) {
    throw new Error('match is not currently in a bonus round state');
  }

  if (!opponent) {
    throw new Error(
      `no opponent was found in bonus handler for player ${player.getUUID()}`
    );
  }

  log.info(
    `player ${player.getUUID()} recorded ${
      bonus.hits
    } hits in their bonus round`
  );

  match.changeTurn();
  await upsertMatchInCache(match);

  // Update the opponent with new game state
  const opponentSocket = getSocketDataContainerByPlayerUUID(opponent.getUUID());
  if (opponentSocket) {
    opponentSocket.send({
      type: OutgoingMsgType.BonusResult,
      data: new PlayerConfiguration(game, opponent, match).toJSON()
    });
  }

  // Update the player with new game state information
  return {
    type: OutgoingMsgType.BonusResult,
    data: new PlayerConfiguration(game, player, match).toJSON()
  };
};

export default bonusHandler;
