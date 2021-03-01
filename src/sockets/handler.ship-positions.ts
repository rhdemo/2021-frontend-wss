import WebSocket from 'ws';
import log from '@app/log';
import { GameState } from '@app/models/game.configuration';
import PlayerConfiguration, {
  PlayerConfigurationData
} from '@app/models/player.configuration';
import * as players from '@app/stores/players';
import { ShipPositionData } from '@app/game/types';
import { validateShipPlacement } from '@app/game';
import { OutgoingMsgType } from '@app/payloads/outgoing';
import { MessageHandler, getPlayerSpecificData } from './common';

const validStates = [GameState.Lobby, GameState.Active];

const shipPositionHandler: MessageHandler<
  ShipPositionData,
  PlayerConfigurationData
> = async (ws: WebSocket, data: ShipPositionData) => {
  log.debug('processing ship-postion payload: %j', data);
  let validatedPlacementData: undefined | ShipPositionData;

  const player = players.getPlayerAssociatedWithSocket(ws);
  if (!player) {
    // TODO: Improve error handling. This could occur if a player disconnects
    // then reconnects, since we do not enforce a second connect sequence
    throw new Error(
      'failed to find player data associated with this websocket'
    );
  }

  const { game, match } = await getPlayerSpecificData(player);

  if (validStates.includes(game.getGameState()) === false) {
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

  // Update the in-memory player object...
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
