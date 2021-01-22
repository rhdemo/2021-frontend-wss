import { ClientEvent, InfinispanClient } from 'infinispan';
import { getGameConfiguration } from '../game';
import log from '../log';
import GameConfiguration from '../models/game.configuration';
import MatchInstance from '../models/match.instance';
import Player from '../models/player';
import PlayerConfiguration from '../models/player.configuration';
import { getPlayerWithUUID, getSocketForPlayer } from '../players';
import { OutgoingMsgType } from '../sockets/payloads';
import { send } from '../sockets/utils';
import * as matchmaking from './index';

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
  if (eventType === 'modify') {
    log.trace(`a modify event was triggered for match ${key}`);
    const match = await matchmaking.getMatchByUUID(key);

    if (match) {
      const matchPlayers = match.getPlayers();

      const players = await Promise.all([
        getPlayerWithUUID(matchPlayers.playerA),
        matchPlayers.playerB
          ? getPlayerWithUUID(matchPlayers.playerB)
          : Promise.resolve(undefined)
      ]);

      const game = getGameConfiguration();

      players.forEach((p) => {
        if (p) {
          log.debug(
            `notifying player ${p.getUUID()} that match ${key} has been modified`
          );
          updatePlayerWithMatchData(p, match, game);
        }
      });
    } else {
      log.warn(
        `a "modify" event was triggered for match instance ${key}, but it was not found when requested from the cache`
      );
    }
  }
}

async function updatePlayerWithMatchData(
  player: Player,
  match: MatchInstance,
  game: GameConfiguration
) {
  const sock = getSocketForPlayer(player);

  if (sock) {
    send(sock, {
      type: OutgoingMsgType.Configuration,
      data: new PlayerConfiguration(game, player, match).toJSON()
    });
  }
}
