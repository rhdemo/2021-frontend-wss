/* eslint-disable @typescript-eslint/no-var-requires */

import fastify, { FastifyInstance } from 'fastify';
import { ServerOptions } from 'ws';
import { WebsocketPluginOptions } from 'fastify-websocket';
import {
  WS_MAX_PAYLOAD,
  HTTP_PORT,
  NODE_ENV,
  FASTIFY_LOG_ENABLED
} from '@app/config';
import { getWsAddressFromServer } from '@app/utils';

const { version } = require('../package.json');
const app = fastify({ logger: NODE_ENV === 'dev' || FASTIFY_LOG_ENABLED });

// Provides a health endpoint to check
app.register(require('./plugins/health'), {
  options: {
    version
  }
});

// Allows testing of cloud events
app.register(require('./plugins/events'));

// Register the WS plugin, apply a max payload limit, and optional authorisation
app.register(require('fastify-websocket'), {
  options: {
    maxPayload: WS_MAX_PAYLOAD,
    verifyClient: (info, next) => {
      // Can add optional verification logic into this block
      next(true);
    }
  } as ServerOptions
} as WebsocketPluginOptions);

// Expose the game WS endpoint
app.register(require('./plugins/game'));

export default async function startServer(): Promise<FastifyInstance> {
  try {
    await app.listen(HTTP_PORT, '0.0.0.0');

    app.log.info(
      `connect via WebSocket to ws://${getWsAddressFromServer(app.server)}/game`
    );

    return app;
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
