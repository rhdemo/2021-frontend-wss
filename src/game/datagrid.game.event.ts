import { Client, ClientEvent } from 'infinispan';
import { DATAGRID_GAME_DATA_KEY } from '../config';

export default function gameDataGridEventHandler(
  client: Client,
  event: ClientEvent,
  key: string
) {
  if (key === DATAGRID_GAME_DATA_KEY) {
    console.log(
      `${new Date()} "${event}" event detected for "${DATAGRID_GAME_DATA_KEY}"`
    );
  } else {
    console.log(
      `${new Date()} "${event}" event detected for unknown key: "${DATAGRID_GAME_DATA_KEY}"`
    );
  }
}
