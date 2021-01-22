import { MessageHandlerResponse, OutgoingMsgType } from './payloads';
import WebSocket from 'ws';
import log from '../log';
import { FastifyInstance } from 'fastify';

const socks = new Map<WebSocket, number>();

export type ResponsePayloadGeneratorFn<T> = () => Promise<T>;

/**
 * Wrapper function that safely sends data to a websocket client
 * @param ws {WebSocket}
 * @param type {OutgoingMsgType}
 * @param data {unknown}
 */
export async function send(ws: WebSocket, response: MessageHandlerResponse) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      const outgoingJson = JSON.stringify({
        type: response.type,
        data: response.data,
        sequence: getSocketSequenceNumber(ws)
      });
      log.trace('sending JSON to client:%j', outgoingJson);
      ws.send(outgoingJson);
    } else {
      log.warn('Attempted to send message on closed socket');
    }
  } catch (error) {
    log.error('Failed to send ws message. Error: %j', error);
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
      send(client, {
        type: OutgoingMsgType.Heartbeat,
        data: {}
      });
    });

    log.debug(`finished heartbeat send for ${clients.size} client(s)`);
  }

  setTimeout(() => heartbeat(app), 5000);
}
