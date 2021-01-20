import { OutgoingMsgType } from './index';
import WebSocket from 'ws';
import log from '../log';
import { FastifyInstance } from 'fastify';

const socks = new Map<WebSocket, number>();

/**
 * Wrapper function that safely sends data to a websocket client
 * @param ws {WebSocket}
 * @param type {OutgoingMsgType}
 * @param data {unknown}
 */
export function send(ws: WebSocket, type: OutgoingMsgType, data: unknown) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type,
          data,
          sequence: getSocketSequenceNumber(ws)
        })
      );
    } else {
      log.warn('Attempted to send message on closed socket');
    }
  } catch (error) {
    log.error('Failed to send ws message. Error: ', error.message);
  }
}

/**
 * Each payload sent to a client will include a sequence number.
 * This function will manage the sequence increment and associated socket.
 * @param ws {WebSocket}
 */
function getSocketSequenceNumber(ws: WebSocket) {
  let sequence: number | undefined = socks.get(ws);

  if (sequence === undefined) {
    // Perform initial setup
    sequence = 0;

    // Remove socket from the set on disconnect
    ws.on('close', () => socks.delete(ws));
  }

  socks.set(ws, ++sequence);

  return sequence;
}

/**
 * Recursively calls itself with the given fastify instance to send a
 * heartbeat message to connected clients
 * @param app
 */
export function heartbeat(app: FastifyInstance) {
  const clients = app.websocketServer.clients;

  if (clients.size > 0) {
    log.debug(`sending heartbeat to ${clients.size} client(s)`);

    clients.forEach((client) => {
      send(client, OutgoingMsgType.Heartbeat, {});
    });

    log.debug(`finished heartbeat send for ${clients.size} client(s)`);
  }

  setTimeout(() => heartbeat(app), 5000);
}
