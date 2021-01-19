import { FastifyInstance } from 'fastify';
import Joi from 'joi';
import WebSocket from 'ws';
import log from '../log';
import connectionHandler from './connection.handler';
import { ConnectionRequestPayload } from './payloads';
import { heartbeat, send } from './utils';

export enum IncomingMsgType {
  Connection = 'connection',
  Ping = 'ping',
  ShipPositions = 'ship-positions'
}

export enum OutgoingMsgType {
  BadPayload = 'invalid-payload',
  Heartbeat = 'heartbeat',
  Configuration = 'configuration'
}

type ParsedWsData = {
  type: IncomingMsgType;
  data: unknown;
};

const WsDataSchema = Joi.object({
  type: Joi.string().valid(
    IncomingMsgType.Connection,
    IncomingMsgType.ShipPositions,
    IncomingMsgType.Ping
  ),
  data: Joi.object()
});

/**
 * Configures a heartbeat for the WSS attached to the given fastify instance.
 * @param app {FastifyInstance}
 */
export function configureHeartbeat(app: FastifyInstance) {
  heartbeat(app);
}

/**
 * Processes an incoming WS payload
 * @param ws {WebSocket}
 * @param data {WebSocket.Data}
 */
export default async function processSocketMessage(
  ws: WebSocket,
  data: WebSocket.Data
) {
  let parsed: ParsedWsData;

  try {
    parsed = JSON.parse(data.toString());
  } catch (error) {
    log.error('Received Malformed socket message JSON. Data was:\n%j', data);
    return;
  }

  const valid = WsDataSchema.validate(parsed);

  if (valid.error || valid.errors) {
    log.warn('client sent an invalid message payload: %j', parsed);
    send(ws, OutgoingMsgType.BadPayload, {
      info: 'Your payload was a bit iffy. K thx bye.'
    });
  } else {
    const trustedData = valid.value as ParsedWsData;

    switch (trustedData.type) {
      case IncomingMsgType.Connection:
        const resp = await connectionHandler(
          ws,
          trustedData.data as ConnectionRequestPayload
        );
        send(ws, OutgoingMsgType.Configuration, resp);
        break;
      default:
        send(ws, OutgoingMsgType.BadPayload, {
          info: 'unrecognised message type'
        });
        break;
    }
  }
}
