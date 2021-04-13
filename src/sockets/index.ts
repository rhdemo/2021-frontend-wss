import WebSocket from 'ws';
import log from '@app/log';
import { OutgoingMsgType } from '@app/payloads/outgoing';
import { WS_HEARTBEAT_INTERVAL } from '@app/config';
import {
  getSocketDataContainer,
  getAllPlayerSocketDataContainers,
  cleanupSocketLookups
} from './player.sockets';
import { MessageHandlerResponse } from './common';

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
    cleanupSocketLookups(ws, container.getPlayer()?.getUUID());
  });

  return container;
}

/**
 * Self-explanatory enough. Sends a message to all connected players.
 * This is a blocking function...so be careful.
 */
export function sendMessageToAllConnectedPlayers(
  data: MessageHandlerResponse<unknown>
) {
  getAllPlayerSocketDataContainers().forEach((container) =>
    container.send(data)
  );
}
