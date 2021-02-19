import { ClientEvent, InfinispanClient } from 'infinispan';
import log from '@app/log';

/**
 * This function is invoked whenever a match instance is updated in the cache.
 * It's responsible for notifying the players relevant players.
 * @param client
 * @param eventType
 * @param key
 */
export default async function matchInstanceDatagridEventHandler(
  client: InfinispanClient,
  eventType: ClientEvent,
  key: string
) {
  log.info(`"${eventType}" event detected for match ${key}`);
}
