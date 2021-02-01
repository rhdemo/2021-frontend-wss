import Joi from 'joi';
import WebSocket from 'ws';
import { getGameConfiguration } from '../game';
import log from '../log';
import { getMatchAssociatedWithPlayer } from '../matchmaking';
import PlayerConfiguration, {
  PlayerConfigurationData
} from '../models/player.configuration';
import * as players from '../players';
import {
  ConnectionRequestPayload,
  MessageHandler,
  OutgoingMsgType,
  ValidationErrorPayload
} from './payloads';
import { getPlayerSpecificData, send } from './utils';

const ConnectionRequestPayloadSchema = Joi.object({
  username: Joi.string(),
  gameId: Joi.string(),
  playerId: Joi.string()
});

const connectionHandler: MessageHandler<
  PlayerConfigurationData | ValidationErrorPayload
> = async (ws: WebSocket, data: unknown) => {
  log.debug('processing connection payload: %j', data);
  const validatedData = ConnectionRequestPayloadSchema.validate(data);

  if (validatedData.error) {
    return {
      type: OutgoingMsgType.BadPayload,
      data: {
        info: validatedData.error.toString()
      }
    };
  } else {
    const player = await players.initialisePlayer(
      ws,
      data as ConnectionRequestPayload
    );

    const { opponent, match, game } = await getPlayerSpecificData(player);

    if (!match) {
      throw new Error(
        `failed to find match associated with player ${player.getUUID()}`
      );
    }

    if (opponent) {
      // This player was added as the second player to a match, so we need
      // to update the other player to let them know an opponent was found
      const sock = players.getSocketForPlayer(opponent);
      if (!sock) {
        log.warn(
          `unable to inform opponent (${opponent.getUUID()}) of player ${player.getUUID()} that the match is now ready, since their socket is missing. they must have disconnected`
        );
      } else {
        log.info(
          `sending configuration to opponent (${opponent.getUUID()}) of player ${player.getUUID()} since match is now ready`
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
  }
};

export default connectionHandler;
