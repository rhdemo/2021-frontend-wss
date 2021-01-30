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
) {}
