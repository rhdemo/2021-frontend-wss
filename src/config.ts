'use strict';

import { get } from 'env-var';

const config = {
  NODE_ENV: get('NODE_ENV').default('dev').asEnum(['dev', 'prod']),
  LOG_LEVEL: get('LOG_LEVEL').asString(),

  // HTTP and WebSocket traffic both use this port
  HTTP_PORT: get('HTTP_PORT').default(3000).asPortNumber(),

  // Reject web socket payloads greater than this many bytes (2KB by default)
  WS_MAX_PAYLOAD: get('WS_MAX_PAYLOAD').default(2048).asIntPositive(),

  // Send a heartbeat to clients every so often to keep connections open
  WS_HEARTBEAT_INTERVAL: get('WS_HEARTBEAT_INTERVAL')
    .default('15000')
    .asIntPositive(),

  // This is the grid size for the game, e.g "5" would produce a 5x5 grid
  GAME_GRID_SIZE: get('GAME_GRID_SIZE').default(5).asIntPositive(),

  AI_AGENT_SERVER_URL: get('AI_AGENT_SERVER_URL')
    .default('http://ai-agent-server.ai.svc.cluster.local:8080/agent')
    .asUrlString(),

  CLOUD_EVENT_BROKER_URL: get('CLOUD_EVENT_BROKER_URL')
    .default(
      'http://broker-ingress.knative-eventing.svc.cluster.local/battleships-backend/default'
    )
    .asUrlString(),

  AWS_ACCESS_KEY_ID: get('AWS_ACCESS_KEY_ID').asString(),
  AWS_SECRET_ACCESS_KEY: get('AWS_SECRET_ACCESS_KEY').asString(),
  AWS_BUCKET_NAME: get('AWS_BUCKET_NAME')
    .default('summit-game-records')
    .asString(),

  DATAGRID_GAME_DATA_STORE: get('DATAGRID_GAME_DATA_STORE')
    .default('game')
    .asString(),
  DATAGRID_GAME_DATA_KEY: get('DATAGRID_GAME_DATA_KEY')
    .default('current-game')
    .asString(),
  DATAGRID_PLAYER_DATA_STORE: get('DATAGRID_PLAYER_DATA_STORE')
    .default('players')
    .asString(),
  DATAGRID_HOST: get('DATAGRID_HOST').default('infinispan').asString(),
  DATAGRID_HOTROD_PORT: get('DATAGRID_HOTROD_PORT')
    .default(11222)
    .asPortNumber()
};

export = config;
