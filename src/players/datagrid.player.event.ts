import { Client, ClientEvent } from 'infinispan'
import { DATAGRID_PLAYER_DATA_KEY } from '../config';
import log from '../log'

export default function playerDataGridEventHandler (client: Client, event: ClientEvent, key: string) {
  log.trace(`"${event}" event detected for player "${key}"`);
}
