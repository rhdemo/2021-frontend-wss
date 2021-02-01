import { InfinispanIteratorEntry } from 'infinispan';
import pLimit from 'p-limit';
import getDataGridClientForCacheNamed from '../datagrid/client';
import log from '../log';
import MatchInstance, { MatchInstanceData } from '../models/match.instance';
import Player from '../models/player';
import matchInstanceDatagridEventHandler from './datagrid.event-handler';

const getClient = getDataGridClientForCacheNamed(
  'match-instances',
  matchInstanceDatagridEventHandler
);
const limit = pLimit(1);
const BATCH_SIZE = 50;

/**
 * Creates a new game instance and adds that player to it.
 * @param player {Player}
 */
async function createMatchInstanceForPlayer(
  player: Player
): Promise<MatchInstance> {
  const match = new MatchInstance(player.getUUID());

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
  const data = await client.get(uuid);
  log.trace(`read match with UUID: ${uuid}`);
  if (data) {
    return MatchInstance.from(JSON.parse(data));
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
  const data = await client.get(uuid);

  if (data) {
    log.trace(`found match for player ${uuid}`);
    return MatchInstance.from(JSON.parse(data));
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

  await client.put(match.getUUID(), JSON.stringify(data));

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
  player: Player
): Promise<MatchInstance> {
  log.info(`match making for player ${player.getUUID()}`);

  const matchInstanceForPlayer = await limit(async () => {
    const client = await getClient;
    const iterator = await client.iterator(BATCH_SIZE);
    const match = await find(iterator.next());

    // No need to wait for this iterator close
    iterator.close();

    if (match) {
      return match;
    } else {
      const match = await createMatchInstanceForPlayer(player);

      log.info(
        `unable to find match for player ${player.getUUID()}. created new match instance ${match.getUUID()}`
      );

      return match;
    }

    async function find(
      entryPromise: Promise<InfinispanIteratorEntry>
    ): Promise<MatchInstance | undefined> {
      const entry = await entryPromise;

      if (entry.done) {
        return;
      } else {
        const match = MatchInstance.from(
          JSON.parse(entry.value) as MatchInstanceData
        );

        log.trace(
          `checking if player ${player.getUUID()} can join match: %j,`,
          match.toJSON()
        );

        if (match.isJoinable()) {
          log.info(
            `adding player ${player.getUUID()} to match ${match.getUUID()}`
          );
          match.addPlayer(player);
          await upsertMatchInCache(match);
          return match;
        } else {
          return find(iterator.next());
        }
      }
    }
  });

  return matchInstanceForPlayer;
}
