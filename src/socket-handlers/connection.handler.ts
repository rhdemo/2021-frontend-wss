import * as WebSocket from 'ws';
import log from '../log';
import GameConfiguration, { GameState } from '../models/game.configuration';
import { createNewPlayer } from '../players';

export type ConnectionRequestPayload = {
  playerId?: string;
  gameId?: string;
};

export default async function connectionHandler(
  ws: WebSocket,
  data: ConnectionRequestPayload
) {
  if (data.gameId && data.playerId) {
    // player/client is reconnecting
  } else {
    // first time player/client is connecting
    const player = await createNewPlayer();

    return new GameConfiguration(
      GameState.LOBBY,
      'a-not-so-unique-game-id',
      player
    ).toJSON();
  }
}
