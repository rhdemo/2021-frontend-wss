import log from '@app/log';
import WebSocket from 'ws';
import PlayerSocketDataContainer from './player.socket.container';

const socks = new Map<WebSocket, PlayerSocketDataContainer>();
const socksLookupCache = new Map<string, PlayerSocketDataContainer>();

export function cleanupSocketLookups(ws: WebSocket, uuid?: string) {
  socks.get(ws)?.close();
  socks.delete(ws);

  if (uuid) {
    // UUID might be undefined if the player did not correctly start a session
    socksLookupCache.delete(uuid)
  }
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
export function getPlayerAssociatedWithSocket(ws: WebSocket) {
  return socks.get(ws)?.getPlayer();
}

/**
 * Returns a Map containing WebSockets and associated data, which includes
 * the UUID of the player associated with the WebSocket
 */
export function getAllPlayerSocketDataContainers() {
  return socks;
}

/**
 * Retrieve a socket container using a player's UUID.
 * Initial lookups require searching the entire Map, but secondary lookups
 *
 * @param uuid
 */
export function getSocketDataContainerByPlayerUUID(
  uuid: string
): PlayerSocketDataContainer | undefined {
  log.trace(`starting socket lookup for player ${uuid}`);

  const fromCache = socksLookupCache.get(uuid)

  if (fromCache) {
    log.trace(`returning cached socket lookup for player ${uuid}`)
    return fromCache
  }

  for (const entry of socks) {
    if (entry[1].getPlayer()?.getUUID() === uuid) {
      log.trace(`socket lookup success for player ${uuid}. place in cache and return`);

      socksLookupCache.set(uuid, entry[1])

      return entry[1];
    }
  }

  log.trace(`socket lookup for fail for player ${uuid}`);
}
