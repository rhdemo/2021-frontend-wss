import { InfinispanClient, ClientEvent } from 'infinispan';
import { getPlayerWithUUID } from '.';
import log from '../log';
import { getMatchByUUID, upsertMatchInCache } from '../matchmaking';

export default async function playerDataGridEventHandler(
  client: InfinispanClient,
  event: ClientEvent,
  key: string
) {
  log.trace(`"${event}" event detected for player "${key}"`);

  const player = await getPlayerWithUUID(key);
  const matchUUID = player?.getMatchInstanceUUID();

  if (!player) {
    log.warn(
      `a change event was detected for player ${key}, but the player could not be read from datagrid`
    );
  } else if (!matchUUID) {
    log.warn(
      `a change event was detected for player ${key}, but the player is not assigned to a match`
    );
  } else {
    log.debug(
      `determining if match ${matchUUID} should be set to ready as a result of a modify event for player ${player.getUUID()}`
    );
    const match = await getMatchByUUID(matchUUID);
    const players = match?.getPlayers();

    if (match && players && players.playerA && players.playerB) {
      // Two players are associated with the match. Check if they've locked
      // their ship positions, and if so set the match "ready" property to true
      const playerInstances = await Promise.all([
        getPlayerWithUUID(players.playerA),
        getPlayerWithUUID(players.playerB)
      ]);

      if (
        playerInstances[0]?.hasLockedShipPositions() &&
        playerInstances[1]?.hasLockedShipPositions()
      ) {
        log.info(
          `players ${playerInstances[0].getUUID()} and ${playerInstances[1].getUUID()} have locked positions. setting match.ready=true for ${matchUUID}`
        );
        // Write the match update to the cache. Match updates automatically get
        // sent to the associated players
        match?.setMatchReady();
        await upsertMatchInCache(match);
      }
    }
  }
}
