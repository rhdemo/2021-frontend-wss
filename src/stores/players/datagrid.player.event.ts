import { InfinispanClient, ClientEvent } from 'infinispan';
import { getPlayerWithUUID } from '.';
import log from '@app/log';
import { upsertMatchInCache } from '@app/stores/matchmaking';
import GameConfiguration from '@app/models/game.configuration';
import MatchInstance from '@app/models/match.instance';
import Player from '@app/models/player';
import PlayerConfiguration from '@app/models/player.configuration';
import { OutgoingMsgType } from '@app/payloads/outgoing';
import { getPlayerSpecificData } from '@app/sockets/common';
import { getSocketDataContainerByPlayerUUID } from '@app/sockets/player.sockets';
import * as newCe from '@app/cloud-events/send.new';

export default async function playerDataGridEventHandler(
  client: InfinispanClient,
  event: ClientEvent,
  key: string
) {
  log.trace(`"${event}" event detected for player "${key}"`);

  if (event === 'modify') {
    const player = await getPlayerWithUUID(key);

    if (!player) {
      return log.error(
        `a modify event was detected for player ${key}, but the player could not be read back from datagrid`
      );
    }

    log.debug('processing modify event for player: %j', player.toJSON());

    if (player.hasAttacked()) {
      log.trace(
        `skipping player ${key} "modify" event logic, since they've already been active and attacking`
      );
      return;
    }

    const { match, opponent, game } = await getPlayerSpecificData(player);

    if (!match) {
      return log.error(
        `a modify event was detected for player ${key}, but the associated match (${player.getMatchInstanceUUID()}) could not be read from datagrid`
      );
    }

    if (!match.isReady()) {
      log.debug(
        `determining if match ${match.getUUID()} should be set to ready as a result of a modify event for player ${player.getUUID()}`
      );

      if (match && opponent) {
        if (
          player.hasLockedShipPositions() &&
          opponent.hasLockedShipPositions()
        ) {
          log.info(
            `players ${player.getUUID()} and ${opponent.getUUID()} have locked positions. setting match.ready=true for ${match.getUUID()}`
          );
          // Write the match update to the cache. Match updates automatically get
          // sent to the associated players
          match.setMatchReady();

          await upsertMatchInCache(match);

          newCe.matchStart({
            ts: Date.now(),
            game: game.getUUID(),
            match: match.getUUID(),
            playerA: {
              uuid: player.getUUID(),
              username: player.getUsername(),
              board: player.getShipPositionData(),
              human: !player.isAiPlayer()
            },
            playerB: {
              uuid: opponent.getUUID(),
              username: opponent.getUsername(),
              board: opponent.getShipPositionData(),
              human: !player.isAiPlayer()
            }
          });

          updatePlayer(player, opponent, game, match);
          updatePlayer(opponent, player, game, match);
        }
      }
    }
  }
}

function updatePlayer(
  player: Player,
  opponent: Player,
  game: GameConfiguration,
  match: MatchInstance
) {
  const sock = getSocketDataContainerByPlayerUUID(player.getUUID());

  if (sock) {
    log.debug(`notify player ${player.getUUID()} that match.ready=true`);
    sock.send({
      type: OutgoingMsgType.Configuration,
      data: new PlayerConfiguration(game, player, match, opponent).toJSON()
    });
  } else {
    log.warn(
      `failed to find socket for player ${player.getUUID()} to notify of match.ready=true`
    );
  }
}
