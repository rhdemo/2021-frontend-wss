import { HOSTNAME } from '@app/config';
import log from '@app/log';
import { OutgoingMsgType } from '@app/payloads/outgoing';
import { getSocketDataContainerByPlayerUUID } from '@app/sockets/player.sockets';
import { CloudEvent, HTTP } from 'cloudevents';
import { FastifyRequest } from 'fastify';

enum EventTypePrefix {
  AttackProcessed = `attackprocessed`,
  BonusProcessed = 'bonusprocessed'
}

type AttackProcessed = {
  game: string;
  match: string;
  uuid: string;
  ts: number;
  delta: number;
  human: boolean;
};

type BonusProcessed = {
  game: string;
  match: string;
  uuid: string;
  ts: number;
  human: boolean;
  delta: number;
};

const ValidEvents = Object.values(EventTypePrefix);

export class UnknownCloudEventError extends Error {
  constructor(type: string) {
    super(`cloud event type "${type}" is not processable by this server`);
  }
}

/**
 * Parses incoming HTTP headers and body to a Cloud Event and returns the
 * CloudEvent instance.
 *
 * Can throw an error if the request is not correctly formatted.
 *
 * @param headers
 * @param body
 */
export function parse(
  headers: FastifyRequest['headers'],
  body: FastifyRequest['body']
): CloudEvent {
  log.trace('parsing cloud event. data: %j', {
    headers,
    body
  });

  return HTTP.toEvent({
    headers,
    body
  });
}

/**
 * Processes events emitted
 * @param headers
 * @param body
 */
export function processEvent(evt: CloudEvent) {
  switch (evt.type) {
    case `${EventTypePrefix.AttackProcessed}-${HOSTNAME}`:
      log.debug(`received "${evt.type}" event: %j`, evt.data);
      processScoreEvent(evt.data as AttackProcessed);
      break;
    case `${EventTypePrefix.BonusProcessed}-${HOSTNAME}`:
      log.debug(`received "${evt.type}" event: %j`, evt.data);
      processScoreEvent(evt.data as BonusProcessed);
      break;
    default:
      throw new UnknownCloudEventError(evt.type);
  }
}

/**
 * Processes attack and bonus processed payloads.
 *
 * This will send a player a score update. This contains the points scored
 * specifically for that action - this is not their total score.
 *
 * @param payload
 */
function processScoreEvent(payload: AttackProcessed | BonusProcessed) {
  if (payload.delta && payload.delta >= 0) {
    const container = getSocketDataContainerByPlayerUUID(payload.uuid);

    if (container) {
      log.debug(
        `sending score update to player ${container.getPlayer()?.getUUID()}`
      );
      container.send({
        type: OutgoingMsgType.ScoreUpdate,
        data: {
          delta: payload.delta
        }
      });
    }
  }
}
