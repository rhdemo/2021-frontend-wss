import { InfinispanIteratorEntry } from 'infinispan';
import pLimit from 'p-limit';
import getDataGridClientForCacheNamed from '@app/datagrid/client';
import log from '@app/log';
import MatchInstance, { MatchInstanceData } from '@app/models/match.instance';
import Player, { UnmatchedPlayerData } from '@app/models/player';
import { DATAGRID_MATCH_DATA_STORE } from '@app/config';

const getClient = getDataGridClientForCacheNamed(DATAGRID_MATCH_DATA_STORE);
const limit = pLimit(1);
const BATCH_SIZE = 50;

/**
 * Creates a new game instance and adds that player to it.
 * @param player {Player}
 */
export async function createMatchInstanceWithData(
  playerA: UnmatchedPlayerData,
  playerB?: UnmatchedPlayerData
): Promise<MatchInstance> {
  log.debug(
    `creating match instance for player(s) [${playerA.uuid}, ${playerB?.uuid}]`
  );

  const match = new MatchInstance(playerA, playerB);

  await upsertMatchInCache(match);

  return match;
}

/**
 * Return a match instance
 * @param uuid
 */
export async function getMatchByUUID(
  uuid: string
): Promise<MatchInstance | undefined> {
  const client = await getClient;
  const data = await client.get<MatchInstanceData>(uuid);
  log.trace(`read match with UUID: ${uuid}`);
  if (data) {
    return MatchInstance.from(data);
  } else {
    return undefined;
  }
}

/**
 * Given a Player, find the match instance that they're associated with.
 * @param player
 */
export async function getMatchAssociatedWithPlayer(
  player: Player
): Promise<MatchInstance | undefined> {
  const uuid = player.getMatchInstanceUUID();
  log.trace(`find match for player ${player.getUUID()}`);

  if (!uuid) {
    throw new Error(`player ${player.getUUID()} is missing a match UUID`);
  }

  const client = await getClient;
  const data = await client.get<MatchInstanceData>(uuid);

  if (data) {
    log.trace(`found match for player ${uuid}`);
    return MatchInstance.from(data);
  } else {
    log.trace(
      `found no match for ${uuid} for player ${player.getMatchInstanceUUID()}`
    );
  }
}

/**
 * Insert/update the given match in the cache
 * @param player
 */
export async function upsertMatchInCache(match: MatchInstance) {
  const client = await getClient;
  const data = match.toJSON();

  log.trace('writing match to cache: %j', data);

  await client.put(match.getUUID(), data);

  return match;
}

/**
 * Searches all available games and attempts to add a player.
 *
 * This operation enforces a concurrency limit of 1. This prevents a race
 * condition that could result in a player being added to a game instance, then
 * being overwritten by another player.
 *
 * TODO: improve this to avoid limiting concurrency
 *
 * @param player {Player}
 */
export async function matchMakeForPlayer(
  player: UnmatchedPlayerData
): Promise<MatchInstance> {
  log.info('matchmaking for player: %j', player);

  const matchInstanceForPlayer = await limit(async () => {
    const client = await getClient;
    const iterator = await client.iterator(BATCH_SIZE);
    const match = await find(iterator.next());

    // No need to wait for this iterator close
    iterator.close();

    if (match) {
      return match;
    } else {
      const newMatch = await createMatchInstanceWithData(player);

      log.info(
        `unable to find match for player ${
          player.uuid
        }. created new match instance ${newMatch.getUUID()}`
      );

      return newMatch;
    }

    async function find(
      entryPromise: Promise<InfinispanIteratorEntry>
    ): Promise<MatchInstance | undefined> {
      const entry = await entryPromise;

      if (entry.done) {
        return;
      } else {
        const potentialMatch = MatchInstance.from(
          JSON.parse(entry.value) as MatchInstanceData
        );

        log.trace(
          `checking if player ${player.uuid} can join match: %j,`,
          potentialMatch.toJSON()
        );

        if (potentialMatch.isJoinable()) {
          log.info(
            `adding player ${player.uuid} to match ${potentialMatch.getUUID()}`
          );
          potentialMatch.addPlayer(player);
          await upsertMatchInCache(potentialMatch);
          return potentialMatch;
        } else {
          return find(iterator.next());
        }
      }
    }
  });

  return matchInstanceForPlayer;
}
