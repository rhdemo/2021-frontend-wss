import WebSocket from 'ws';
import log from '@app/log';
import PlayerConfiguration, {
  PlayerConfigurationData
} from '@app/models/player.configuration';
import * as players from '@app/stores/players';
import { OutgoingMsgType } from '@app/payloads/outgoing';
import { ConnectionRequestPayload } from '@app/payloads/incoming';
import { MessageHandler } from './common';
import { getPlayerSpecificData, send } from './common';
import { AI_AGENT_SERVER_URL } from '@app/config';
import Player from '@app/models/player';
import { http } from '@app/utils';

const connectionHandler: MessageHandler<
  ConnectionRequestPayload,
  PlayerConfigurationData
> = async (ws: WebSocket, data: ConnectionRequestPayload) => {
  log.debug('processing connection payload: %j', data);

  const player = await players.initialisePlayer(ws, data);

  const { opponent, match, game } = await getPlayerSpecificData(player);

  if (!match) {
    throw new Error(
      `failed to find match associated with player ${player.getUUID()}`
    );
  }

  if (opponent && opponent.isAiPlayer()) {
    // Need to create the AI agent anytime the player connects/reconnects. This
    // is because there's a chance that if the player is reconnecting that
    // something went wrong, and we should play it safe by calling the AI agent
    // create endpoint again.
    //
    // It's fine if the AI agent already exists since the AI agent server can
    // handle a follow-up creation request.
    createAiOpponentAgent(opponent, game.getUUID());
  }

  if (opponent && !opponent.isAiPlayer()) {
    // If matched with a non-AI opponent we need to let that opponent know
    // that a match has been found. They might already be aware, but better
    // safe than sorry...or bored in their case since they could be left
    // sitting and waiting for this message if we don't send it
    const sock = players.getSocketForPlayer(opponent);
    if (!sock) {
      log.warn(
        `unable to inform opponent (${opponent.getUUID()}) of player ${player.getUUID()} that an opponent was found, since their socket is missing. they must have disconnected. this is OK, since they'll get updated on reconnecting`
      );
    } else {
      log.info(
        `sending configuration to opponent (${opponent.getUUID()}) of player ${player.getUUID()}`
      );
      send(sock, {
        type: OutgoingMsgType.Configuration,
        data: new PlayerConfiguration(game, opponent, match, player).toJSON()
      });
    }
  }

  return {
    type: OutgoingMsgType.Configuration,
    data: new PlayerConfiguration(game, player, match, opponent).toJSON()
  };
};

/**
 * Send a request to the AI agent server to create an AI player instance
 * for the given UUID and Username
 * @param aiOpponent {Player}
 * @param gameId {String}
 */
async function createAiOpponentAgent(aiOpponent: Player, gameId: string) {
  await http(AI_AGENT_SERVER_URL, {
    method: 'POST',
    json: {
      gameId,
      uuid: aiOpponent.getUUID(),
      username: aiOpponent.getUsername()
    }
  });
}

export default connectionHandler;
