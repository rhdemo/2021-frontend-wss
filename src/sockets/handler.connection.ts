import WebSocket from 'ws';
import log from '@app/log';
import PlayerConfiguration, {
  PlayerConfigurationData
} from '@app/models/player.configuration';
import * as players from '@app/stores/players';
import {
  OutgoingMsgType,
  ValidationErrorPayload
} from '@app/payloads/outgoing';
import { ConnectionRequestPayload } from '@app/payloads/incoming';
import { ConnectionRequestPayloadSchema } from '@app/payloads/schemas';
import { MessageHandler } from './common';
import { getPlayerSpecificData, send } from './common';

const connectionHandler: MessageHandler<
  PlayerConfigurationData | ValidationErrorPayload
> = async (ws: WebSocket, data: unknown) => {
  log.debug('processing connection payload: %j', data);
  const validatedData = ConnectionRequestPayloadSchema.validate(data, {
    stripUnknown: true
  });

  if (validatedData.error) {
    return {
      type: OutgoingMsgType.BadPayload,
      data: {
        info: validatedData.error.toString()
      }
    };
  } else {
    log.trace('validated connection payload: %j', validatedData.value);
    const player = await players.initialisePlayer(
      ws,
      validatedData.value as ConnectionRequestPayload
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
