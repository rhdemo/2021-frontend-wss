import { DATAGRID_GAME_DATA_KEY } from '../config';
import getDataGridClientForCacheNamed from '../datagrid/client';
import gameDataGridEventHandler from './datagrid.game.event';
import { Client } from 'infinispan';

let dg: Client;

export async function initialise() {
  dg = await getDataGridClientForCacheNamed(
    DATAGRID_GAME_DATA_KEY,
    gameDataGridEventHandler
  );
}
