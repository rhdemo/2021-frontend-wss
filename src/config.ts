'use strict';

import { get } from 'env-var';

const config = {
  NODE_ENV: get('NODE_ENV').default('dev').asEnum(['dev', 'prod']),
  LOG_LEVEL: get('LOG_LEVEL').asString(),
  FASTIFY_LOG_ENABLED: get('FASTIFY_LOG_ENABLED').default('false').asBool(),

  // HTTP and WebSocket traffic both use this port
  HTTP_PORT: get('HTTP_PORT').default(3000).asPortNumber(),

  // Maximum number of connections to use when making http requests to
  // a given origin. This does not affect incoming requests to this server
  MAX_HTTP_AGENT_SOCKETS: get('MAX_HTTP_AGENT_SOCKETS')
    .default(100)
    .asIntPositive(),

  // Reject web socket payloads greater than this many bytes (2KB by default)
  WS_MAX_PAYLOAD: get('WS_MAX_PAYLOAD').default(2048).asIntPositive(),

  // Send a heartbeat to clients every so often to keep connections open
  WS_HEARTBEAT_INTERVAL: get('WS_HEARTBEAT_INTERVAL')
    .default('15000')
    .asIntPositive(),

  // If a player action is not received within this time we close their socket
  // Defaults to 30 minutes. We need sufficient time during demos to chat etc.
  WS_ACTIVITY_TIMEOUT_MS: get('WS_ACTIVITY_TIMEOUT_MS')
    .default(30 * 60 * 1000)
    .asIntPositive(),

  // This is the grid size for the game, e.g "5" would produce a 5x5 grid
  GAME_GRID_SIZE: get('GAME_GRID_SIZE').default(5).asIntPositive(),

  // The duration of the bonus round in milliseconds
  GAME_BONUS_DURATION_MS: get('GAME_BONUS_DURATION_MS')
    .default(5000)
    .asIntPositive(),

  // Max number of hits a player can record in a bonus round
  GAME_MAX_BONUS_HITS: get('GAME_MAX_BONUS_HITS').default(100).asIntPositive(),

  AI_AGENT_SERVER_URL: get('AI_AGENT_SERVER_URL')
    .default('http://ai-agent-server.ai.svc.cluster.local:8080/agent')
    .asUrlString(),

  SCORING_SERVICE_URL: get('SCORING_SERVICE_URL')
    .default(
      'http://scoring-service.battleships-scoring.svc.cluster.local:8080/'
    )
    .asUrlString(),

  CLOUD_EVENT_WARN_THRESHOLD: get('CLOUD_EVENT_WARN_THRESHOLD')
    .default('100')
    .asIntPositive(),
  CLOUD_EVENT_DISABLED: get('CLOUD_EVENT_DISABLED').default('false').asBool(),
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
  DATAGRID_MATCH_DATA_STORE: get('DATAGRID_MATCH_DATA_STORE')
    .default('match-instances')
    .asString(),
  DATAGRID_HOST: get('DATAGRID_HOST').default('infinispan').asString(),
  DATAGRID_HOTROD_PORT: get('DATAGRID_HOTROD_PORT')
    .default(11222)
    .asPortNumber(),

  // These are used to construct a websocket URL for agents to connect
  HOSTNAME: get('HOSTNAME').default('localhost').asString(),
  NAMESPACE: get('NAMESPACE').asString()
};

export = config;
