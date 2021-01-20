import { ClientEvent, InfinispanClient } from 'infinispan';
import { date } from 'joi';
import { getGameConfiguration } from '../game';
import GameConfiguration from '../models/game.configuration';
import MatchInstance from '../models/match.instance';
import Player from '../models/player';
import PlayerConfiguration from '../models/player.configuration';
import { getPlayerWithUUID, getSocketForPlayer } from '../players';
import { OutgoingMsgType } from '../sockets';
import { send } from '../sockets/utils';
import * as matchmaking from './index';

export default async function matchInstanceDatagridEventHandler(
  client: InfinispanClient,
  eventType: ClientEvent,
  key: string
) {
  if (eventType === 'modify') {
    const match = await matchmaking.getMatchByUUID(key);

    if (match) {
      const matchPlayers = match.getPlayers();

      const players = await Promise.all([
        getPlayerWithUUID(matchPlayers.playerA),
        matchPlayers.playerB
          ? getPlayerWithUUID(matchPlayers.playerB)
          : Promise.resolve(undefined)
      ]);

      const game = await getGameConfiguration();

      players.forEach((p) => {
        if (p) {
          updatePlayerWithMatchData(p, match, game);
        }
      });
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
    send(
      sock,
      OutgoingMsgType.Configuration,
      new PlayerConfiguration(game, player, match).toJSON()
    );
  }
}
