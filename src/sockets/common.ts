import { OutgoingMsgType } from '@app/payloads/outgoing';
import WebSocket from 'ws';
import log from '@app/log';
import { FastifyInstance } from 'fastify';
import Player from '@app/models/player';
import { getMatchAssociatedWithPlayer } from '@app/stores/matchmaking';
import { getPlayerWithUUID } from '@app/stores/players';
import { getGameConfiguration } from '@app/stores/game';

type SocketData = { sequence: number; locked: boolean };

const socks = new WeakMap<WebSocket, SocketData>();

export type MessageHandlerResponse<T = unknown> = {
  type: OutgoingMsgType;
  data: T;
};

export type MessageHandler<IncomingType, ResponseType> = (
  ws: WebSocket,
  data: IncomingType
) => Promise<MessageHandlerResponse<ResponseType>>;

/**
 * Get the metadata associated with the given WebSocket
 * @param ws
 */
function getSocketData(ws: WebSocket): SocketData {
  const s = socks.get(ws);

  if (!s) {
    // Remove socket from the set on disconnect
    ws.on('close', () => socks.delete(ws));

    // Lazily initialise socket data and event handler
    return setSocketData(ws, {
      sequence: 0,
      locked: false
    });
  }

  return s;
}

/**
 * Set the metadata associated with the given WebSocket
 * @param ws
 * @param data
 */
function setSocketData(ws: WebSocket, data: SocketData): SocketData {
  socks.set(ws, data);

  return data;
}

/**
 * Determines if the given socket is locked. The lock on a socket is a mutex
 * used to prevent processing multiple incoming messages for a given socket.
 *
 * The mutex does NOT affect outbound data, i.e the server can freely send
 * out updates as necessary.
 *
 * @param ws
 */
export function isLockedSocket(ws: WebSocket) {
  return getSocketData(ws).locked;
}

/**
 * Lock the given socket
 * @param ws
 */
export function lockSock(ws: WebSocket) {
  const data = getSocketData(ws);

  setSocketData(ws, {
    sequence: data.sequence,
    locked: true
  });
}

/**
 * Unlock the given socket
 * @param ws
 */
export function unlockSock(ws: WebSocket) {
  const data = getSocketData(ws);

  setSocketData(ws, {
    sequence: data.sequence,
    locked: false
  });
}

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
  let { sequence, locked } = getSocketData(ws);

  setSocketData(ws, {
    locked,
    sequence: ++sequence
  });

  return sequence;
}

/**
 * Poorly named function that will return everything that's required to process
 * most messages and game logic for a given player
 * @param {Player} player
 */
export async function getPlayerSpecificData(player: Player) {
  log.debug(
    `fetching match, game, and opponent data for player ${player.getUUID()}`
  );
  const match = await getMatchAssociatedWithPlayer(player);
  const opponentUUID = await match?.getPlayerOpponentUUID(player);
  const opponent = opponentUUID
    ? await getPlayerWithUUID(opponentUUID)
    : undefined;
  const game = getGameConfiguration();

  return {
    opponent,
    match,
    game
  };
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
