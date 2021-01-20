import WebSocket from 'ws';
import { getGameConfiguration } from '../game';
import { getMatchAssociatedWithPlayer, getMatchByUUID } from '../matchmaking';
import PlayerConfiguration from '../models/player.configuration';
import { initialisePlayer } from '../players';
import { ConnectionRequestPayload } from './payloads';

export default async function connectionHandler(
  ws: WebSocket,
  data: ConnectionRequestPayload
) {
  const game = await getGameConfiguration();
  const player = await initialisePlayer(ws, data);
  const match = await getMatchAssociatedWithPlayer(player);

  if (!match) {
    throw new Error(
      `failed to find match associated with player ${player.getUUID()}`
    );
  }

  return new PlayerConfiguration(game, player, match).toJSON();
}
