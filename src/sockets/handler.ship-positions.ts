import WebSocket from 'ws';
import { getGameConfiguration } from '../game';
import log from '../log';
import PlayerConfiguration, {
  PlayerConfigurationData
} from '../models/player.configuration';
import { getPlayerAssociatedWithSocket, upsertPlayerInCache } from '../players';
import { validateShipPlacement } from '../validations';
import { ShipPositionDataPayload } from './payloads';

export default async function shipPositionHandler(
  ws: WebSocket,
  data: ShipPositionDataPayload
): Promise<PlayerConfigurationData> {
  const player = getPlayerAssociatedWithSocket(ws);
  const game = await getGameConfiguration();

  if (!player) {
    // TODO: Improve error handling. This could occur if a player disconnects
    // then reconnects, since we do not enforce a second connect sequence
    throw new Error(
      'failed to find player data associated with this websocket'
    );
  }

  try {
    validateShipPlacement(data);
  } catch (e) {
    log.warn(
      `player ${player.getUUID()} failed placement validation due to error: %j`,
      e
    );
  }

  player.setValidShipPositionData(data);

  await upsertPlayerInCache(player);

  return new PlayerConfiguration(game, player).toJSON();
}
