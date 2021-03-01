import { DATAGRID_PLAYER_DATA_STORE, NODE_ENV } from '@app/config';
import getDataGridClientForCacheNamed from '@app/datagrid/client';
import Player from '@app/models/player';
import playerDataGridEventHandler from './datagrid.player.event';
import log from '@app/log';
import WebSocket from 'ws';
import generateUserName from './username.generator';
import { nanoid } from 'nanoid';
import { ConnectionRequestPayload } from '@app/payloads/incoming';
import { getGameConfiguration } from '@app/stores/game';
import { matchMakeForPlayer } from '@app/stores/matchmaking';

const getClient = getDataGridClientForCacheNamed(
  DATAGRID_PLAYER_DATA_STORE,
  playerDataGridEventHandler
);
const playerSockets = new Map<WebSocket, Player>();

/**
 * Initialises a Player entity based on an incoming "connection" event
 * @param ws
 * @param data
 */
export async function initialisePlayer(
  ws: WebSocket,
  data: ConnectionRequestPayload
) {
  let player: Player | undefined;
  const game = getGameConfiguration();

  log.debug('client connected with connection payload: %j', data);

  if (data.playerId && game.getUUID() === data.gameId) {
    // Client/Player is reconnecting with previous connection info
    log.debug(
      `player "${data.playerId}" is trying to reconnect for game "${data.gameId}"`
    );
    player = await getPlayerWithUUID(data.playerId);
  }

  if (!player || player.getUsername() !== data.username) {
    // first time client is connecting, or they provided stale lookup data
    // we compare the usernames as an extra layer of protection, though UUIDs
    // should be enough realistically...
    player = await createNewPlayer({ ai: false });

    log.info('created new player: %j', player.toJSON());
  } else {
    log.info('retrieved existing player: %j', player.toJSON());
  }

  if (!player.getMatchInstanceUUID()) {
    log.info(
      `connecting player ${player.getUUID()} has not been assigned a match. Will matchmake now.`
    );

    let opponent: Player | undefined;

    if (NODE_ENV === 'prod' || (NODE_ENV === 'dev' && data.useAiOpponent)) {
      // We default to using AI opponents, but this can be bypassed in dev env
      opponent = await createNewPlayer({ ai: true });
      log.info(
        `created AI opponent in cache for player ${player.getUUID()}: %j`,
        opponent.toJSON()
      );
    }

    const instance = await matchMakeForPlayer(player, opponent);

    // Update the player and opponent in infinispan with their match data
    player.setMatchInstanceUUID(instance.getUUID());

    if (opponent) {
      opponent.setMatchInstanceUUID(instance.getUUID());
      await upsertPlayerInCache(opponent);
    }

    await upsertPlayerInCache(player);
  }

  // Keep a reference to the player's socket to facilitate communication by
  // using their UUID for lookup
  log.info(`adding player ${player.getUUID()} to sockets pool`);

  const existingSocketForPlayer = getSocketForPlayer(player);
  if (existingSocketForPlayer) {
    // Player is connecting despite the fact they seem to be connected already.
    // This is sus. Accept this new connection, but close the existing one.
    existingSocketForPlayer.close();
    playerSockets.delete(existingSocketForPlayer);
  }

  // Store a reference to this socket and player combination
  playerSockets.set(ws, player);
  const uuid = player.getUUID();
  ws.on('close', (code) => {
    log.debug(
      `removing player ${uuid} from player sockets pool due to socket "close" event with code ${code}`
    );
    playerSockets.delete(ws);
  });

  return player;
}

/**
 * Fetches a player associated with a given socket
 * @param sock
 */
export function getPlayerAssociatedWithSocket(ws: WebSocket) {
  return playerSockets.get(ws);
}

/**
 * Finds the WebSocket for a given Player.
 * @param player
 */
export function getSocketForPlayer(player: Player): WebSocket | undefined {
  const targetUUID = player.getUUID();
  for (const entry of playerSockets) {
    if (entry[1].getUUID() === targetUUID) {
      return entry[0];
    }
  }
}

/**
 * Returns a Map of websockets and the associated Player object
 */
export function getAllConnectedPlayers() {
  return playerSockets;
}

/**
 * Returns an instance of a Player from the cache, or undefined if the player
 * was not found in the cache
 * @param uuid
 */
export async function getPlayerWithUUID(
  uuid: string
): Promise<Player | undefined> {
  log.trace(`reading data for player ${uuid}`);
  const client = await getClient;
  const data = await client.get(uuid);

  if (data) {
    try {
      return Player.from(JSON.parse(data));
    } catch {
      log.warn(
        `found player data for "${uuid}", but failed to parse to JSON: %j`,
        data
      );
      return undefined;
    }
  } else {
    return undefined;
  }
}

/**
 * Insert/Update the player entry in the cache
 * @param player
 */
export async function upsertPlayerInCache(player: Player) {
  const data = player.toJSON();
  const client = await getClient;
  log.trace(`writing player to cache: %j`, data);
  return client.put(player.getUUID(), JSON.stringify(data));
}

/**
 * Creates a new player. Will be recursively called until there's no naming
 * conflict with an existing player.
 */
async function createNewPlayer(opts: { ai: boolean }): Promise<Player> {
  log.info('creating a new player');
  const username = generateUserName();
  const uuid = nanoid();

  const player = new Player(username, opts.ai, uuid);
  const existingPlayerWithSameUsername = await getPlayerWithUUID(username);

  if (existingPlayerWithSameUsername) {
    log.warn(
      `a player with the username "${username}" already exists. retrying player create to obtain a unique username`
    );
    return createNewPlayer(opts);
  } else {
    await upsertPlayerInCache(player);

    return player;
  }
}
