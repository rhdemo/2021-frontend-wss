import WebSocket from 'ws';
import GameConfiguration, { GameState } from '../models/game.configuration';
import { createNewPlayer } from '../players';
import { ShipsLockedData } from '../validations';

const positions = require('../../payloads/pieces.locked.valid.json');

export type ConnectionRequestPayload = {
  username?: string;
  gameId?: string;
};

export default async function connectionHandler(
  ws: WebSocket,
  data: ConnectionRequestPayload
) {
  if (data.gameId && data.username) {
    // player/client is reconnecting
  } else {
    // first time player/client is connecting
    const player = await createNewPlayer();

    return new GameConfiguration(
      GameState.LOBBY,
      'a-not-so-unique-game-id',
      player,
      positions as ShipsLockedData
    ).toJSON();
  }
}
