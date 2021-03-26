import { DATAGRID_GAME_DATA_KEY, DATAGRID_GAME_DATA_STORE } from '@app/config';
import getDataGridClientForCacheNamed from '@app/datagrid/client';
import { ClientEvent, InfinispanClient } from 'infinispan';
import delay from 'delay';
import log from '@app/log';
import GameConfiguration from '@app/models/game.configuration';
import { sendMessageToAllConnectedPlayers } from '@app/sockets';
import { OutgoingMsgType } from '@app/payloads/outgoing';

const getClient = getDataGridClientForCacheNamed(
  DATAGRID_GAME_DATA_STORE,
  gameConfigurationDatagridEventHandler
);

let currentGameConfig: GameConfiguration;

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
    currentGameConfig = GameConfiguration.from(JSON.parse(gameData));
    log.info(
      `${DATAGRID_GAME_DATA_STORE}/${DATAGRID_GAME_DATA_KEY} value is: %j`,
      currentGameConfig.toJSON()
    );
  }
}

/**
 * Get the current game configuration object.
 * @returns {GameConfiguration}
 */
export function getGameConfiguration() {
  return currentGameConfig;
}

async function getGameConfigurationFromCache() {
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

export default async function gameConfigurationDatagridEventHandler(
  client: InfinispanClient,
  eventType: ClientEvent
) {
  log.debug(`detected game data "${eventType}" event`);
  if (eventType === 'modify') {
    const freshGameData = await getGameConfigurationFromCache();
    const isReset = freshGameData.getUUID() !== currentGameConfig.getUUID();

    // Replace old stale in-memory config with new data
    currentGameConfig = freshGameData;

    if (isReset) {
      log.info(
        'a game reset was detected, let players know their session has expired'
      );
    } else {
      sendMessageToAllConnectedPlayers({
        type: OutgoingMsgType.GameState,
        data: {
          game: freshGameData
        }
      });
    }
  } else {
    log.error(
      `detected a "${eventType}" for the game state. this shouldn't happen!`
    );
  }
}
