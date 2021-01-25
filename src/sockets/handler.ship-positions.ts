import WebSocket from 'ws';
import { getGameConfiguration } from '../game';
import log from '../log';
import * as matchmaking from '../matchmaking';
import { GameState } from '../models/game.configuration';
import { StoredShipData } from '../models/player';
import PlayerConfiguration, {
  PlayerConfigurationData
} from '../models/player.configuration';
import * as players from '../players';
import { validateShipPlacement, ShipPositionData } from '../validations';
import { MessageHandler, OutgoingMsgType } from './payloads';

const validStates = [GameState.Lobby, GameState.Active];

const shipPositionHandler: MessageHandler<PlayerConfigurationData> = async (
  ws: WebSocket,
  data: unknown
) => {
  log.debug('processing ship-postion payload: %j', data);
  let validatedPlacementData: undefined | ShipPositionData = undefined;

  const player = players.getPlayerAssociatedWithSocket(ws);
  if (!player) {
    // TODO: Improve error handling. This could occur if a player disconnects
    // then reconnects, since we do not enforce a second connect sequence
    throw new Error(
      'failed to find player data associated with this websocket'
    );
  }

  const game = getGameConfiguration();
  if (validStates.includes(game.getGameState()) === false) {
    throw new Error(
      `player ${player.getUUID()} cannot set positions when game state is "${game.getGameState()}"`
    );
  }

  const match = await matchmaking.getMatchAssociatedWithPlayer(player);
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
