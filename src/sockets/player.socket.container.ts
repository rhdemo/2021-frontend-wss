import { NODE_ENV } from '@app/config';
import log from '@app/log';
import { WsPayload } from '@app/payloads/incoming';
import { OutgoingMsgType } from '@app/payloads/outgoing';
import { DEFAULT_JOI_OPTS, WsPayloadSchema } from '@app/payloads/schemas';
import Joi from 'joi';
import WebSocket from 'ws';
import { MessageHandlerResponse } from './common';
import { HandlerNotFoundError, processSocketMessage } from './handlers';

/**
 * This class is used as a WebSocket wrapper to:
 *  - Safely send messages out a WebSocket
 *  - Gate the flow of incoming messages using a lock/mutex
 *  - Process incoming messages appropriately
 *  - Store metadata alongside the socket to link it with a player
 */
export default class PlayerSocketDataContainer {
  private locked = false;
  private sequence = 0;
  private playerInfo:
    | undefined
    | { uuid: string; username: string } = undefined;

  constructor(private ws: WebSocket) {}

  send(response: MessageHandlerResponse) {
    try {
      if (this.ws.readyState === WebSocket.OPEN) {
        const outgoingJson = JSON.stringify({
          type: response.type,
          data: response.data,
          sequence: this.getSequenceNumber()
        });
        log.trace('sending JSON to client:%j', outgoingJson);
        this.ws.send(outgoingJson);
      } else {
        log.warn(
          'Attempted to send message on closed socket for player: %j',
          this.playerInfo
        );
      }
    } catch (error) {
      log.error('Failed to send ws message. Error: %j', error);
    }
  }

  async processMessage(data: WebSocket.Data) {
    if (this.isLocked()) {
      log.warn(
        "client sent a message, but we're already processing one on their behalf"
      );
      this.send({
        type: OutgoingMsgType.PleaseWait,
        data: {
          info:
            'Already processing a message on your behalf. Slow down there kiddo!'
        }
      });
    } else {
      log.trace(`processing incoming socket data: ${data.toString()}`);

      // Lock the socket mutex. Any new messages received from a client will be
      // ignored until we finish processing the current message.
      this.lock();

      try {
        const json = JSON.parse(data.toString());
        const valid = WsPayloadSchema.validate(json, DEFAULT_JOI_OPTS);

        if (valid.error) {
          throw valid.error;
        }

        this.send(await processSocketMessage(this, valid.value as WsPayload));
      } catch (e) {
        if (e instanceof SyntaxError) {
          log.error(
            'received malformed socket message JSON/Buffer. Buffer contained:\n%j',
            data.toString()
          );
          this.send({
            type: OutgoingMsgType.BadPayload,
            data: {
              info: 'Your JSON payload was a bit iffy. K thx bye.'
            }
          });
        } else if (e instanceof Joi.ValidationError) {
          log.warn(
            `message failed schema validation with reason "${
              e.message
            }": ${data.toString()}`
          );
          this.send({
            type: OutgoingMsgType.BadPayload,
            data: {
              info: e.message
            }
          });
        } else if (e instanceof HandlerNotFoundError) {
          this.send({
            type: OutgoingMsgType.BadMessageType,
            data: {
              info: `"${e.type}" is an unrecognised message type`
            }
          });
        } else {
          log.error(`error processing an incoming message: ${data.toString()}`);
          log.error(e);
          this.send({
            type: OutgoingMsgType.ServerError,
            data: {
              info:
                NODE_ENV == 'dev'
                  ? e.toString()
                  : 'there was an error processing your payload'
            }
          });
        }
      } finally {
        // Lift the mutex so the client can send more messages to the server
        this.unlock();
      }
    }
  }

  close() {
    this.ws.close();
  }

  isLocked() {
    return this.locked;
  }

  lock() {
    this.locked = true;
  }

  unlock() {
    this.locked = false;
  }

  setPlayerInfo(info: { uuid: string; username: string }) {
    this.playerInfo = info;
  }

  getPlayerInfo() {
    return this.playerInfo;
  }

  getSequenceNumber() {
    return ++this.sequence;
  }
}
