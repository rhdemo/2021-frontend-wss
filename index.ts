import fastify, { FastifyInstance } from 'fastify';
import { ServerOptions } from 'ws';
import { WebsocketPluginOptions } from 'fastify-websocket';
import { WS_MAX_PAYLOAD, HTTP_PORT } from './config';
import { getWsAddressFromServer } from './utils';

const app = fastify({ logger: true });

app.get('/', async (request, reply) => {
  return { hello: 'world' };
});

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

// This is the WS endpoint, i.e ws://localhost:3000/game
app.get('/game', { websocket: true }, (conn, req) => {
  conn.on('error', (err: any) => {
    app.log.error(
      `error generated. client will be disconnected due to: ${err}`
    );
  });
  conn.on('close', () => {
    app.log.error(`client connection closed`);
  });
  conn.socket.on('message', (message) => {
    app.log.info(`received message ${message}`);
    // echo the incoming message back
    conn.socket.send(message);
  });
});

const start = async () => {
  try {
    await app.listen(HTTP_PORT);
    app.log.info(
      `Connect vai WebSocket to ws://${getWsAddressFromServer(app.server)}/game`
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
