'use strict';

import { get } from 'env-var';

const config = {
  HTTP_PORT: get('HTTP_PORT').default(3000).asPortNumber(),

  // Reject web socket payloads greater than this many bytes (1KB by default)
  WS_MAX_PAYLOAD: get('WS_MAX_PAYLOAD').default(1024).asIntPositive(),

  // This is the grid size for the game, e.g "5" would produce a 5x5 grid
  GAME_GRID_SIZE: get('GAME_GRID_SIZE').default(5).asIntPositive()
};

export = config;
