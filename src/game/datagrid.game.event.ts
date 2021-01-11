import { Client, ClientEvent } from 'infinispan';
import { DATAGRID_GAME_DATA_KEY } from '../config';
import log from '../log';

export default function gameDataGridEventHandler(
  client: Client,
  event: ClientEvent,
  key: string
) {
  if (key === DATAGRID_GAME_DATA_KEY) {
    log.info(
      `${new Date()} "${event}" event detected for "${DATAGRID_GAME_DATA_KEY}"`
    );
  }
}
