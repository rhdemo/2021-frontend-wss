import log from '@app/log';
import Player from '@app/models/player';
import { OutgoingMsgType } from '@app/payloads/outgoing';
import { getGameConfiguration } from '@app/stores/game';
import { getMatchAssociatedWithPlayer } from '@app/stores/matchmaking';
import { getPlayerWithUUID } from '@app/stores/players';
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
  log.debug(
    `fetching match, game, and opponent data for player ${player.getUUID()}`
  );
  const match = await getMatchAssociatedWithPlayer(player);
  const opponentUUID = match?.getPlayerOpponentUUID(player);
  const opponent = opponentUUID
    ? await getPlayerWithUUID(opponentUUID)
    : undefined;
  const game = getGameConfiguration();

  return {
    opponent,
    match,
    game
  };
}
