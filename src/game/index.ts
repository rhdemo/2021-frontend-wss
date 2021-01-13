import {
  DATAGRID_GAME_DATA_KEY,
  DATAGRID_GAME_DATA_STORE,
  NODE_ENV
} from '../config';
import getDataGridClientForCacheNamed from '../datagrid/client';
import gameDataGridEventHandler from './datagrid.game.event';
import { InfinispanClient } from 'infinispan';
import delay from 'delay';
import log from '../log';
import GameConfiguration from '../models/game.configuration';

const getClient = getDataGridClientForCacheNamed(
  DATAGRID_GAME_DATA_STORE,
  gameDataGridEventHandler
);

/**
 * Power on self test for game data.
 * This can be used to block application startup.
 */
export async function POST(): Promise<void> {
  const client = await getClient;

  const gameData = await client.get(DATAGRID_GAME_DATA_KEY);

  if (!gameData) {
    log.warn(
      `${DATAGRID_GAME_DATA_STORE}/${DATAGRID_GAME_DATA_KEY} was not found in datagrid. retrying initialisation in 5 seconds`
    );

    return delay(5000).then(() => POST());
  } else {
    log.info(
      `${DATAGRID_GAME_DATA_STORE}/${DATAGRID_GAME_DATA_KEY} value is: %j`,
      JSON.parse(gameData)
    );
  }
}

export async function getGameConfiguration() {
  const client = await getClient;
  const data = await client.get(DATAGRID_GAME_DATA_KEY);

  if (data) {
    return GameConfiguration.from(JSON.parse(data));
  } else {
    throw new Error(
      `${DATAGRID_GAME_DATA_STORE}/${DATAGRID_GAME_DATA_KEY} was missing!`
    );
  }
}
