import log from '@app/log';
import WebSocket from 'ws';
import PlayerSocketDataContainer from './player.socket.container';

const socks = new Map<WebSocket, PlayerSocketDataContainer>();

export function deleteSocketDataContainer(ws: WebSocket) {
  socks.get(ws)?.close();
  socks.delete(ws);
}

/**
 * Get the container for a given WebSocket. Lazily creates a container if
 * one doesn't already exist.
 * @param ws
 */
export function getSocketDataContainer(ws: WebSocket) {
  let container = socks.get(ws);

  if (!container) {
    log.trace('adding new player socket and data container to map');

    container = new PlayerSocketDataContainer(ws);

    socks.set(ws, container);
  }

  return container;
}

/**
 * Retrieve the player data associated with a given WebSocket
 * @param ws
 */
export function getPlayerDataAssociatedWithSocket(ws: WebSocket) {
  return socks.get(ws)?.getPlayerInfo();
}

/**
 * Returns a Map containing WebSockets and associated data, which includes
 * the UUID of the player associated with the WebSocket
 */
export function getAllPlayerSocketDataContainers() {
  return socks;
}

/**
 * Retrieve a container using a player's UUID
 * @param uuid
 */
export function getSocketDataContainerByPlayerUUID(
  uuid: string
): PlayerSocketDataContainer | undefined {
  log.trace(`starting socket lookup for player ${uuid}`);
  for (const entry of socks) {
    if (entry[1].getPlayerInfo()?.uuid === uuid) {
      log.trace(`socket lookup success for player ${uuid}`);
      return entry[1];
    }
  }

  log.trace(`socket lookup for fail for player ${uuid}`);
}
