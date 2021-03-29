import log from '@app/log';
import Player from '@app/models/player';
import { OutgoingMsgType } from '@app/payloads/outgoing';
import { getGameConfiguration } from '@app/stores/game';
import { getMatchAssociatedWithPlayer } from '@app/stores/matchmaking';
import PlayerSocketDataContainer from './player.socket.container';

export type MessageHandlerResponse<T = unknown> = {
  type: OutgoingMsgType;
  data: T;
};

export type MessageHandler<IncomingType, ResponseType> = (
  ws: PlayerSocketDataContainer,
  data: IncomingType
) => Promise<MessageHandlerResponse<ResponseType>>;

/**
 * Poorly named function that will return everything that's required to process
 * most messages and game logic for a given player
 * @param {Player} player
 */
export async function getPlayerSpecificData(player: Player) {
  const playerUUID = player.getUUID();
  log.debug(`fetching match, game, and opponent data for player ${playerUUID}`);

  const game = getGameConfiguration();
  const match = await getMatchAssociatedWithPlayer(player);

  if (!match) {
    throw new Error(
      `failed to find match (${player.getMatchInstanceUUID()}) associated with player ${player.getUUID()}`
    );
  }

  const matchPlayer = match.getMatchPlayerInstanceByUUID(player.getUUID());
  const opponent = match.getPlayerOpponent(player);

  if (!matchPlayer) {
    throw new Error(
      `failed to read MatchPlayer for player ${player.getUUID()} from match`
    );
  }

  return {
    match,
    opponent,
    player: matchPlayer,
    game
  };
}
