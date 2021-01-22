import Joi from 'joi';
import WebSocket from 'ws';
import { getGameConfiguration } from '../game';
import log from '../log';
import { getMatchAssociatedWithPlayer } from '../matchmaking';
import PlayerConfiguration, {
  PlayerConfigurationData
} from '../models/player.configuration';
import { initialisePlayer } from '../players';
import {
  ConnectionRequestPayload,
  MessageHandler,
  OutgoingMsgType,
  ValidationErrorPayload
} from './payloads';

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
    const game = getGameConfiguration();
    const player = await initialisePlayer(ws, data as ConnectionRequestPayload);
    const match = await getMatchAssociatedWithPlayer(player);

    if (!match) {
      throw new Error(
        `failed to find match associated with player ${player.getUUID()}`
      );
    }

    return {
      type: OutgoingMsgType.Configuration,
      data: new PlayerConfiguration(game, player, match).toJSON()
    };
  }
};

export default connectionHandler;
