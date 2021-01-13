import { InfinispanClient, ClientEvent } from 'infinispan';
import log from '../log';

export default function playerDataGridEventHandler(
  client: InfinispanClient,
  event: ClientEvent,
  key: string
) {
  log.trace(`"${event}" event detected for player "${key}"`);
}
