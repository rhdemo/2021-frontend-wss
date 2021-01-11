import { OutgoingMsgType } from './index';
import WebSocket from 'ws';
import log from '../log';
import { FastifyInstance } from 'fastify';

export function send(ws: WebSocket, type: OutgoingMsgType, data: unknown) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type,
          data
        })
      );
    } else {
      log.warn('Attempted to send message on closed socket');
    }
  } catch (error) {
    log.error('Failed to send ws message. Error: ', error.message);
  }
}

export function heartbeat(app: FastifyInstance) {
  const clients = app.websocketServer.clients;

  log.info(`starting heartbeat send for ${clients.size} client(s)`);

  clients.forEach((client) => {
    send(client, OutgoingMsgType.Heartbeat, {});
  });

  log.info(`finished heartbeat send for ${clients.size} client(s)`);

  setTimeout(() => heartbeat(app), 5000);
}
