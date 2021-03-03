import WebSocket from 'ws';
import log from '@app/log';
import { OutgoingMsgType } from '@app/payloads/outgoing';
import { WS_HEARTBEAT_INTERVAL } from '@app/config';
import {
  getSocketDataContainer,
  getAllPlayerSocketDataContainers,
  deleteSocketDataContainer
} from './player.sockets';

/**
 * Start a heartbeat loop to keep connected sockets alive.
 * Recursively calls itself every WS_HEARTBEAT_INTERVAL milliseconds.
 */
export function heartbeat() {
  const clients = getAllPlayerSocketDataContainers();

  if (clients.size > 0) {
    log.info(`sending heartbeat to ${clients.size} client(s)`);

    clients.forEach((client) => {
      client.send({
        type: OutgoingMsgType.Heartbeat,
        data: {}
      });
    });

    log.info(`finished heartbeat send for ${clients.size} client(s)`);
  }

  setTimeout(() => heartbeat(), WS_HEARTBEAT_INTERVAL);
}

/**
 * Setup listeners for socket events
 * @param ws
 */
export function configureSocket(ws: WebSocket) {
  const container = getSocketDataContainer(ws);

  ws.on('message', (message) => container.processMessage(message));

  ws.on('close', () => {
    log.trace(
      'removing player socket and data container from map due to socket closure'
    );
    deleteSocketDataContainer(ws);
  });

  return container;
}
