import log from '@app/log';
import PlayerConfiguration, {
  PlayerConfigurationData
} from '@app/models/player.configuration';
import * as players from '@app/stores/players';
import { OutgoingMsgType } from '@app/payloads/outgoing';
import { ConnectionRequestPayload } from '@app/payloads/incoming';
import { MessageHandler } from './common';
import { getPlayerSpecificData } from './common';
import {
  AI_AGENT_SERVER_URL,
  HOSTNAME,
  HTTP_PORT,
  NAMESPACE
} from '@app/config';
import Player from '@app/models/match.player';
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

  // This will either return an existing player, or create a new one. If the
  // given data param contains valid "uuid" and "username" strings then a
  // existing player is returned, otherwise a new player is created.
  const basePlayer = await players.initialisePlayer(data);

  const { match, game, opponent, player } = await getPlayerSpecificData(
    basePlayer
  );

  if (data.playerId === player.getUUID()) {
    // If the player successfully reconnected, then we need to ensure their
    // previous socket is closed to prevent any funny business or odd
    // behaviour. The previous socket can be found closed their playerId
    log.info(
      `player ${data.playerId} reconnected. removing previous socket from pool if it exists`
    );
    getSocketDataContainerByPlayerUUID(data.playerId)?.close();
  }

  container.setPlayer(basePlayer);

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
    // If matched with a non-AI opponent we need to let that person know
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
      log.debug(
        `sending configuration to opponent (${opponent.getUUID()}) of player ${player.getUUID()}`
      );
      opponentConatiner.send({
        type: OutgoingMsgType.Configuration,
        data: new PlayerConfiguration(game, opponent, match).toJSON()
      });
    }
  }

  return {
    type: OutgoingMsgType.Configuration,
    data: new PlayerConfiguration(game, player, match).toJSON()
  };
};

/**
 * Generates a URL for AI agents to connect to this specific instance.
 *
 * We need this since the application is run using a StatefulSet and it's
 * vital that the AI agent and human player connect to the same Pod.
 * @returns {string}
 */
function getWsUrl(): string {
  if (NAMESPACE && HOSTNAME !== 'localhost') {
    // Create a resolvable URL to the OpenShift service, e.g:
    // ws://game-server-0.frontend.svc.cluster.local:8080/game
    return `ws://${HOSTNAME}.${NAMESPACE}.svc.cluster.local:${HTTP_PORT}/game`;
  } else {
    // Running in local development within docker
    return `ws://${HOSTNAME}:${HTTP_PORT}/game`;
  }
}

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
      wsUrl: getWsUrl(),
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
