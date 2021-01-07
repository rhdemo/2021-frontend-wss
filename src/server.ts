import fastify from 'fastify';
import { ServerOptions } from 'ws';
import { WebsocketPluginOptions } from 'fastify-websocket';
import { WS_MAX_PAYLOAD, HTTP_PORT } from './config';
import { getWsAddressFromServer } from './utils';

const { version } = require('../package.json')
const app = fastify({ logger: true });

// Provides a health endpoint to check
app.register(require('./plugins/health'), {
  options: {
    version
  }
})

// Register the WS plugin, apply a max payload limit, and optional authorisation
app.register(require('fastify-websocket'), {
  options: {
    maxPayload: WS_MAX_PAYLOAD,
    verifyClient: (info, next) => {
      // Can add optional verification logic into this block
      const addr =
        info.req.headers['x-forwarded-for'] || info.req.socket.remoteAddress;
      app.log.info(`accepted connection from ${addr}`);
      next(true);
    }
  } as ServerOptions
} as WebsocketPluginOptions);

// Expose the game WS endpoint
app.register(require('./plugins/game'))

export default async function startServer () {
  try {
    await app.listen(HTTP_PORT, '0.0.0.0');

    app.log.info(
      `connect via WebSocket to ws://${getWsAddressFromServer(app.server)}/game`
    );

    return app
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
