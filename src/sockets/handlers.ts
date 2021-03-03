import { IncomingMsgType, WsPayload } from '@app/payloads/incoming';
import {
  ConnectionRequestPayloadSchema,
  ShipsLockedPayloadSchema,
  AttackPayloadSchema,
  DEFAULT_JOI_OPTS
} from '@app/payloads/schemas';
import log from '@app/log';
import Joi from 'joi';
import { MessageHandler } from './common';
import attackHandler from './handler.attack';
import connectionHandler from './handler.connection';
import shipPositionHandler from './handler.ship-positions';
import PlayerSocketDataContainer from './player.socket.container';

type MessageHandlersContainer = {
  [key in IncomingMsgType]: {
    schema: Joi.Schema;
    fn: MessageHandler<any, any>;
  };
};

const MessageHandlers: MessageHandlersContainer = {
  [IncomingMsgType.Connection]: {
    fn: connectionHandler,
    schema: ConnectionRequestPayloadSchema
  },
  [IncomingMsgType.ShipPositions]: {
    fn: shipPositionHandler,
    schema: ShipsLockedPayloadSchema
  },
  [IncomingMsgType.Attack]: {
    fn: attackHandler,
    schema: AttackPayloadSchema
  }
};

/**
 * Find an appropriate handler for the incoming message. Use the handler
 * validation to verify the message format, then use the handler function to
 * process the message and return a result.
 *
 * @param container {PlayerSocketDataContainer}
 * @param payload {WsPayload}
 */
export async function processSocketMessage(
  container: PlayerSocketDataContainer,
  payload: WsPayload
) {
  log.debug('finding handler for message: %j', payload);
  const handler = MessageHandlers[payload.type];

  if (handler) {
    const validation = handler.schema.validate(payload.data, DEFAULT_JOI_OPTS);

    if (validation.error) {
      throw validation.error;
    } else {
      return handler.fn(container, validation.value);
    }
  } else {
    throw new HandlerNotFoundError(payload.type);
  }
}

export class HandlerNotFoundError extends Error {
  constructor(public type: string) {
    super();
  }
}
