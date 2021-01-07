import Joi from "joi";
import * as WebSocket from 'ws';
import log from '../log'
import connectionHandler, { ConnectionRequestPayload } from "./connection.handler";

enum IncomingMsgType {
  Connection = 'connection',
  Ping = 'ping',
  ShipPositions = 'ship-positions'
}

enum OutgoingMsgType {
  BadPayload = 'invalid-payload',
  Heartbeat = "heartbeat",
  Configuration = "configuration"
}

type ParsedWsData = {
  type: IncomingMsgType,
  data: unknown
}

const WsDataSchema = Joi.object({
  type: Joi.string().valid(
    IncomingMsgType.Connection,
    IncomingMsgType.ShipPositions,
    IncomingMsgType.Ping
  ),
  data: Joi.object()
})

export default async function processSocketMessage (ws: WebSocket, data: WebSocket.Data) {
  let parsed: ParsedWsData

  try {
    parsed = JSON.parse(data.toString());
  } catch (error) {
    log.error("Received Malformed socket message JSON. Data was:\n%j", data);
    return;
  }

  const valid = WsDataSchema.validate(parsed)

  if (valid.error || valid.errors) {
    send(ws, OutgoingMsgType.BadPayload, {
      info: 'Your payload was a bit iffy. K thx bye.'
    })
  } else {
    switch (parsed.type) {
      case IncomingMsgType.Connection:
        const resp = await connectionHandler(ws, data as ConnectionRequestPayload)
        send(ws, OutgoingMsgType.Configuration, resp)
        break;
      default:
        send(ws, OutgoingMsgType.BadPayload, {
          info: 'unrecognised message type'
        })
        break;
    }
  }

}

function send(ws: WebSocket, type: OutgoingMsgType, data: unknown) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type,
        data
      }));
    } else {
      log.warn("Attempted to send message on closed socket");
    }
  } catch (error) {
    log.error("Failed to send ws message. Error: ", error.message);
  }
}
