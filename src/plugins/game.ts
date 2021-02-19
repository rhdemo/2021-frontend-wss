import { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import log from '@app/log';
import processSocketMessage from '@app/sockets';

const gameRoutePlugin: FastifyPluginCallback = (server, options, done) => {
  // This is the WS endpoint, i.e ws://localhost:3000/game
  server.get('/game', { websocket: true }, (conn) => {
    conn.on('error', (err) => {
      server.log.error(
        `error generated. client will be disconnected due to: ${err}`
      );
    });
    conn.on('close', () => {
      server.log.error(`client connection closed`);
    });
    conn.socket.on('message', (message) => {
      log.trace('incoming socket payload: %j', message);
      processSocketMessage(conn.socket, message);
    });
  });

  done();
};

export default fp(gameRoutePlugin);
