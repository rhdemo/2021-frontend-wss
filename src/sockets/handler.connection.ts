import log from '@app/log';
import PlayerConfiguration, {
  PlayerConfigurationData
} from '@app/models/player.configuration';
import * as players from '@app/stores/players';
import { OutgoingMsgType } from '@app/payloads/outgoing';
import { ConnectionRequestPayload } from '@app/payloads/incoming';
import { MessageHandler } from './common';
import { getPlayerSpecificData } from './common';
import { AI_AGENT_SERVER_URL } from '@app/config';
import Player from '@app/models/player';
import { http } from '@app/utils';
import { getSocketDataContainerByPlayerUUID } from './player.sockets';
import PlayerSocketDataContainer from './player.socket.container';

const connectionHandler: MessageHandler<
  ConnectionRequestPayload,
  PlayerConfigurationData
> = async (
  container: PlayerSocketDataContainer,
  data: ConnectionRequestPayload
) => {
  log.debug('processing connection payload: %j', data);

  const player = await players.initialisePlayer(data);

  const { opponent, match, game } = await getPlayerSpecificData(player);

  if (!match) {
    // A match should always be found. A player is added to a match during
    // the execution of the initialisePlayer function
    throw new Error(
      `failed to find match associated with player ${player.getUUID()}`
    );
  }

  if (data.playerId === player.getUUID()) {
    // If the player successfully reconnected, then we need to ensure their
    // previous socket is closed to prevent any funny business or odd
    // behaviour. The previous socket can be found closed their playerId
    log.info(
      'player reconnected. removing previous socket from pool if it exists'
    );
    getSocketDataContainerByPlayerUUID(data.playerId)?.close();
  }

  log.info(`adding player ${player.getUUID()} to their socket container`);
  container.setPlayerInfo({
    uuid: player.getUUID(),
    username: player.getUsername()
  });

  if (opponent && opponent.isAiPlayer()) {
    // Need to create the AI agent anytime the player connects/reconnects. This
    // is because there's a chance that if the player is reconnecting that
    // something went wrong, and we should play it safe by calling the AI agent
    // create endpoint again.
    //
    // It's fine if the AI agent already exists since the AI agent server can
    // gracefully handle a follow-up creation request and return a 200 OK.
    createAiOpponentAgent(opponent, game.getUUID());
  }

  if (opponent && !opponent.isAiPlayer()) {
    // If matched with a non-AI opponent we need to let that opponent know
    // that an opponent has been found. They might already be aware, but better
    // safe than sorry...or bored in their case since they could be left
    // sitting and waiting for this message if we don't make sure to send it
    const opponentConatiner = getSocketDataContainerByPlayerUUID(
      opponent.getUUID()
    );
    if (!opponentConatiner) {
      log.warn(
        `unable to inform opponent (${opponent.getUUID()}) of player ${player.getUUID()} that an opponent was found, since their socket is missing. they must have disconnected. this is OK, since they'll get updated on reconnecting`
      );
    } else {
      log.info(
        `sending configuration to opponent (${opponent.getUUID()}) of player ${player.getUUID()}`
      );
      opponentConatiner.send({
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
function createAiOpponentAgent(aiOpponent: Player, gameId: string) {
  http(AI_AGENT_SERVER_URL, {
    method: 'POST',
    json: {
      gameId,
      uuid: aiOpponent.getUUID(),
      username: aiOpponent.getUsername()
    }
  })
    .then(() => {
      log.debug(`successfully created AI agent ${aiOpponent.getUUID()}`);
    })
    .catch((e) => {
      log.error(
        `error returned when creating AI Agent player: %j`,
        aiOpponent.toJSON()
      );
      log.error(e);
    });
}

export default connectionHandler;
