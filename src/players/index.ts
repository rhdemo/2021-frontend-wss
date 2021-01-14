import { DATAGRID_PLAYER_DATA_STORE } from '../config';
import getDataGridClientForCacheNamed from '../datagrid/client';
import Player from '../models/player';
import playerDataGridEventHandler from './datagrid.player.event';
import log from '../log';
import WebSocket from 'ws';
import generateUserName from './username.generator';
import { nanoid } from 'nanoid';
import { ShipsLockedData } from '../validations';
import { ConnectionRequestPayload } from '../sockets/payloads';
import { getGameConfiguration } from '../game';
import { matchMakeForPlayer } from '../matchmaking';

const positions = require('../../payloads/pieces.locked.valid.json');
const getClient = getDataGridClientForCacheNamed(
  DATAGRID_PLAYER_DATA_STORE,
  playerDataGridEventHandler
);
const playerSockets = new Map<string, { player: Player; ws: WebSocket }>();

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
  const game = await getGameConfiguration();

  if (data.uuid && game.getUUID() === data.gameId) {
    // client is reconnecting
    player = await getPlayerWithUUID(data.uuid);
  }

  if (!player || player.getUsername() !== data.username) {
    // first time client is connecting, or they provided stale lookup data
    // we compare the usernames as an extra layer of protection, though UUIDs
    // should be enough realistically...
    player = await createNewPlayer();

    log.info('created new player: %j', player.toJSON());
  } else {
    log.info('retrieved existing player: %j', player.toJSON());
  }

  if (!player.getMatchInstanceUUID()) {
    // player has not been matched to a game instance, so we do it now
    const instance = await matchMakeForPlayer(player);

    player.setMatchInstanceUUID(instance.getUUID());

    // Update the player model in infinispan with this data
    await upsertPlayerInCache(player);
  }

  // Keep a reference to the player's socket to facilitate communication by
  // using their UUID for lookup
  log.info(`adding player ${player.getUUID()} to sockets pool`);
  playerSockets.set(player.getUUID(), {
    ws,
    player
  });

  const uuid = player.getUUID();
  ws.on('close', () => {
    log.debug(
      `removing player ${uuid} from player sockets pool due to socket "close" event`
    );
    playerSockets.delete(uuid);
  });

  return player;
}

/**
 * Returns an instance of a Player from the cache, or undefined if the player
 * was not found in the cache
 * @param uuid
 */
async function getPlayerWithUUID(uuid: string): Promise<Player | undefined> {
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
async function upsertPlayerInCache(player: Player) {
  const data = player.toJSON();
  const client = await getClient;

  return client.put(player.getUUID(), JSON.stringify(data));
}

/**
 * Creates a new player. Will be recursively called until there's no naming
 * conflict with an existing player.
 */
async function createNewPlayer(): Promise<Player> {
  const username = generateUserName();
  const uuid = nanoid();

  const player = new Player(
    username,
    0,
    uuid,
    undefined,
    positions as ShipsLockedData
  );
  const existingPlayerWithSameUsername = await getPlayerWithUUID(username);

  if (existingPlayerWithSameUsername) {
    return createNewPlayer();
  } else {
    await upsertPlayerInCache(player);

    return player;
  }
}
