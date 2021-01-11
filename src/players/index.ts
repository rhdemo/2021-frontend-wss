import { Client } from 'infinispan';
import { DATAGRID_PLAYER_DATA_KEY } from '../config';
import getDataGridClientForCacheNamed from '../datagrid/client';
import Player from '../models/player';
import playerDataGridEventHandler from './datagrid.player.event';
import log from '../log';
import generateUserName from './username.generator';

let dg: Client;

export async function initialise() {
  dg = await getDataGridClientForCacheNamed(
    DATAGRID_PLAYER_DATA_KEY,
    playerDataGridEventHandler
  );
}

export async function getPlayerByUsername(username: string) {
  const data = await dg.get(username);

  if (data) {
    try {
      return Player.from(JSON.parse(data));
    } catch {
      log.warn(
        `found player data for "${username}", but failed to parse to JSON: %j`,
        data
      );
      return undefined;
    }
  } else {
    return undefined;
  }
}

export async function putPlayer(player: Player) {
  const data = player.toJSON();
  return dg.put(data.username, JSON.stringify(data));
}

export async function createNewPlayer(): Promise<Player> {
  const username = generateUserName();
  const player = new Player(username, 0);

  const existingPlayer = await getPlayerByUsername(username);

  if (existingPlayer) {
    return createNewPlayer();
  } else {
    await putPlayer(player);

    return player;
  }
}
