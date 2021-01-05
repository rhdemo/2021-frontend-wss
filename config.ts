'use strict';

const { get } = require('env-var');

const config = {
  HTTP_PORT: get('HTTP_PORT').default(3000).asPortNumber(),

  // Reject web socket payloads greater than this many bytes (1KB by default)
  WS_MAX_PAYLOAD: get('WS_MAX_PAYLOAD')
    .default(1024)
    .asIntPositive(),
};

export = config;
