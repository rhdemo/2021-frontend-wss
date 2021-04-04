import { IncomingMsgType, WsPayload } from '@app/payloads/incoming';
import { validators } from '@app/payloads/jsonschema'
import log from '@app/log';
import { MessageHandler } from './common';
import attackHandler from './handler.attack';
import connectionHandler from './handler.connection';
import shipPositionHandler from './handler.ship-positions';
import PlayerSocketDataContainer from './player.socket.container';
import bonusHandler from './handler.bonus';
import { ValidateFunction } from 'ajv';
import ValidationError from 'ajv/dist/runtime/validation_error';


type MessageHandlersContainer = {
  [key in IncomingMsgType]: {
    schema: ValidateFunction;
    fn: MessageHandler<any, any>;
  };
};

const MessageHandlers: MessageHandlersContainer = {
  [IncomingMsgType.Connection]: {
    fn: connectionHandler,
    schema: validators.connection
  },
  [IncomingMsgType.ShipPositions]: {
    fn: shipPositionHandler,
    schema: validators['ship-positions']
  },
  [IncomingMsgType.Attack]: {
    fn: attackHandler,
    schema: validators.attack
  },
  [IncomingMsgType.Bonus]: {
    fn: bonusHandler,
    schema: validators.bonus
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
    const valid = handler.schema(payload.data);

    if (!valid) {
      if (handler.schema.errors) {
        throw new ValidationError(handler.schema.errors);
      }

      throw new Error(`Ajv validation failed with an unknown error for "${payload.type}" payload.`)
    } else {
      log.trace(`invoking "${payload.type}" handler with data: %j`, payload.data)
      return handler.fn(container, payload.data);
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
