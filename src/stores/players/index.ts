import { DATAGRID_PLAYER_DATA_STORE, NODE_ENV } from '@app/config';
import getDataGridClientForCacheNamed from '@app/datagrid/client';
import Player, { UnmatchedPlayerData } from '@app/models/player';
import log from '@app/log';
import generateUserName from './username.generator';
import { nanoid } from 'nanoid';
import { ConnectionRequestPayload } from '@app/payloads/incoming';
import { getGameConfiguration } from '@app/stores/game';
import {
  createMatchInstanceWithData,
  matchMakeForPlayer
} from '@app/stores/matchmaking';
import MatchInstance from '@app/models/match.instance';

const getClient = getDataGridClientForCacheNamed(DATAGRID_PLAYER_DATA_STORE);

/**
 * Initialises a Player entity based on an incoming "connection" event.
 *
 * After this function has finished we'll have:
 *
 *  - A new player in DATAGRID_PLAYER_DATA_STORE.
 *  - Possibly a new match in  DATAGRID_MATCH_DATA_STORE, or the player will
 *    be assigned to an existing match.
 *
 * @param data
 */
export async function initialisePlayer(data: ConnectionRequestPayload) {
  log.debug('client connected with connection payload: %j', data);

  const game = getGameConfiguration();

  if (data.playerId) {
    log.debug(
      `player "${data.playerId}" is trying to reconnect for game "${
        data.gameId
      }", and current game is ${game.getUUID()}`
    );
  }

  if (game.getUUID() === data.gameId) {
    log.debug(`reading player ${data.playerId} for reconnect`);
    const player = data.playerId
      ? await getPlayerWithUUID(data.playerId)
      : undefined;

    if (
      !player ||
      player.getUsername() !== data.username ||
      game.getUUID() !== data.gameId
    ) {
      // First time this client is connecting, or they provided stale lookup data
      // we compare the usernames as an extra layer of protection, though UUIDs
      // should be enough realistically...
      return setupNewPlayer(data);
    } else {
      log.info('retrieved existing player: %j', player.toJSON());

      return player;
    }
  } else {
    log.warn(
      `player ${data.playerId} attempted to reconnect for expired game ${data.gameId}`
    );
    return setupNewPlayer(data);
  }
}

async function setupNewPlayer(data: ConnectionRequestPayload) {
  const newPlayerData = await generateNewPlayerData({ ai: false });
  let newOpponentData!: UnmatchedPlayerData;
  let match: MatchInstance;

  log.debug('setting up new player: %j', newPlayerData);

  if (NODE_ENV === 'prod' || (NODE_ENV === 'dev' && data.useAiOpponent)) {
    // We default to using AI opponents, but this can be bypassed in dev env
    newOpponentData = await generateNewPlayerData({ ai: true });
    log.info(`created AI opponent for player: %j`, newOpponentData);
    match = await createMatchInstanceWithData(newPlayerData, newOpponentData);
  } else {
    log.info(
      'Perform matchmake for player since they have opted to play vs human'
    );
    match = await matchMakeForPlayer(newPlayerData);
  }

  const player = new Player({
    ...newPlayerData,
    match: match.getUUID()
  });

  if (newOpponentData) {
    const opponent = new Player({
      ...newOpponentData,
      match: match.getUUID()
    });

    await upsertPlayerInCache(opponent);
  }

  await upsertPlayerInCache(player);

  return player;
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
async function generateNewPlayerData(opts: {
  ai: boolean;
}): Promise<UnmatchedPlayerData> {
  const username = generateUserName();
  const uuid = nanoid();

  const player = { username, isAi: opts.ai, uuid };
  const existingPlayerWithSameUsername = await getPlayerWithUUID(username);

  if (existingPlayerWithSameUsername) {
    log.warn(
      `a player with the username "${username}" already exists. retrying player create to obtain a unique username`
    );
    return generateNewPlayerData(opts);
  } else {
    return player;
  }
}
