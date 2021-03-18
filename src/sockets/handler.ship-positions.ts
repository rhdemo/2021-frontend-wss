import log from '@app/log';
import { GameState } from '@app/models/game.configuration';
import PlayerConfiguration, {
  PlayerConfigurationData
} from '@app/models/player.configuration';
import * as players from '@app/stores/players';
import { ShipPositionData } from '@app/game/types';
import { validateShipPlacement } from '@app/game';
import { OutgoingMsgType } from '@app/payloads/outgoing';
import { getPlayerSpecificData } from './common';
import PlayerSocketDataContainer from './player.socket.container';
import { MessageHandler } from './common';

const shipPositionHandler: MessageHandler<
  ShipPositionData,
  PlayerConfigurationData
> = async (container: PlayerSocketDataContainer, data: ShipPositionData) => {
  log.debug('processing ship-postion payload: %j', data);
  let validatedPlacementData: undefined | ShipPositionData;

  const info = container.getPlayerInfo();
  if (!info) {
    // TODO: Improve error handling. This could occur if a player disconnects
    // then reconnects, since we do not enforce a second connect sequence
    throw new Error(
      'failed to find player data associated with this websocket'
    );
  }

  const player = await players.getPlayerWithUUID(info.uuid);

  if (!player) {
    throw new Error(`failed to read player ${info.uuid} from cache`);
  }

  const { game, match } = await getPlayerSpecificData(player);

  if (!game.isInState(GameState.Active) && !game.isInState(GameState.Lobby)) {
    throw new Error(
      `player ${player.getUUID()} cannot set positions when game state is "${game.getGameState()}"`
    );
  }

  if (!match) {
    throw new Error(
      `failed to find match associated with player ${player.getUUID()}`
    );
  }

  if (player.hasLockedShipPositions()) {
    log.warn(
      `not allowing player ${player.getUUID()} to change already locked positions`
    );
    return {
      type: OutgoingMsgType.Configuration,
      data: new PlayerConfiguration(game, player, match).toJSON()
    };
  }

  try {
    validatedPlacementData = validateShipPlacement(data);
  } catch (e) {
    log.warn(
      `player ${player.getUUID()} failed placement validation due to error: %j`,
      e
    );
  }

  // Update the in-memory player object. If validation was successful pass the
  // validated data. If it failed keep the old data and mark it as invalid.
  player.setShipPositionData(
    validatedPlacementData || (data as ShipPositionData),
    validatedPlacementData ? true : false
  );

  await players.upsertPlayerInCache(player);

  return {
    type: OutgoingMsgType.Configuration,
    data: new PlayerConfiguration(game, player, match).toJSON()
  };
};

export default shipPositionHandler;
