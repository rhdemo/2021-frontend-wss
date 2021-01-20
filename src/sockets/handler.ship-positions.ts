import WebSocket from 'ws';
import { getGameConfiguration } from '../game';
import log from '../log';
import { getMatchAssociatedWithPlayer } from '../matchmaking';
import PlayerConfiguration, {
  PlayerConfigurationData
} from '../models/player.configuration';
import {
  getPlayerAssociatedWithSocket,
  upsertPlayerInCache,
  getPlayerWithUUID
} from '../players';
import { validateShipPlacement, ShipPositionData } from '../validations';
import { ShipPositionDataPayload } from './payloads';

export default async function shipPositionHandler(
  ws: WebSocket,
  data: ShipPositionDataPayload
): Promise<PlayerConfigurationData> {
  let validatedPlacementData: undefined | ShipPositionData = undefined;

  const player = getPlayerAssociatedWithSocket(ws);
  if (!player) {
    // TODO: Improve error handling. This could occur if a player disconnects
    // then reconnects, since we do not enforce a second connect sequence
    throw new Error(
      'failed to find player data associated with this websocket'
    );
  }

  const game = await getGameConfiguration();
  const match = await getMatchAssociatedWithPlayer(player);
  if (!match) {
    throw new Error(
      `failed to find match associated with player ${player.getUUID()}`
    );
  }

  if (player.hasLockedShipPositions()) {
    log.warn(
      `player ${player.getUUID()} attempted to change already locked positions`
    );
    return new PlayerConfiguration(game, player, match).toJSON();
  }

  try {
    validatedPlacementData = validateShipPlacement(data);
  } catch (e) {
    log.warn(
      `player ${player.getUUID()} failed placement validation due to error: %j`,
      e
    );
  }

  const opponentId = match.getPlayerOpponentUUID(player);

  // Update the in-memory player object...
  player.setShipPositionData(
    validatedPlacementData || data,
    validatedPlacementData ? true : false
  );

  const results = await Promise.all([
    // ...and write it to the cache
    upsertPlayerInCache(player),
    opponentId ? getPlayerWithUUID(opponentId) : Promise.resolve(undefined)
  ]);

  return new PlayerConfiguration(game, player, match).toJSON();
}
