import WebSocket from 'ws';
import { getGameConfiguration } from '../game';
import PlayerConfiguration from '../models/player.configuration';
import { initialisePlayer } from '../players';
import { ConnectionRequestPayload } from './payloads';

export default async function connectionHandler(
  ws: WebSocket,
  data: ConnectionRequestPayload
) {
  const game = await getGameConfiguration();
  const player = await initialisePlayer(ws, data);

  return new PlayerConfiguration(game, player).toJSON();
}
