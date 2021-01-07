'use strict';

import { get } from 'env-var';

const config = {
  NODE_ENV: get('NODE_ENV').default('dev').asEnum(['dev', 'prod']),
  LOG_LEVEL: get('LOG_LEVEL').asString(),

  // HTTP and WebSocket traffic both use this port
  HTTP_PORT: get('HTTP_PORT').default(3000).asPortNumber(),

  // Reject web socket payloads greater than this many bytes (1KB by default)
  WS_MAX_PAYLOAD: get('WS_MAX_PAYLOAD').default(1024).asIntPositive(),

  // This is the grid size for the game, e.g "5" would produce a 5x5 grid
  GAME_GRID_SIZE: get('GAME_GRID_SIZE').default(5).asIntPositive(),

  DATAGRID_GAME_DATA_KEY: get('DATAGRID_GAME_DATA_KEY')
    .default('game')
    .asString(),
  DATAGRID_PLAYER_DATA_KEY: get('DATAGRID_PLAYER_DATA_KEY')
    .default('players')
    .asString(),
  DATAGRID_HOST: get('DATAGRID_HOST').default('infinispan').asString(),
  DATAGRID_HOTROD_PORT: get('DATAGRID_HOTROD_PORT')
    .default(11222)
    .asPortNumber()
};

export = config;
