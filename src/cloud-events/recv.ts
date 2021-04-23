import { HOSTNAME } from '@app/config';
import log from '@app/log';
import { OutgoingMsgType } from '@app/payloads/outgoing';
import { getSocketDataContainerByPlayerUUID } from '@app/sockets/player.sockets';
import { HTTP } from 'cloudevents';
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

export class UnknownCloudEventError extends Error {
  constructor(type: string) {
    super(`cloud event type "${type}" is not processable by this server`);
  }
}

/**
 * Parses incoming HTTP headers and body to a Cloud Event and process it.
 * Can throw an error if the request is not correctly formatted.
 *
 * @param headers
 * @param body
 */
export function processEvent(
  headers: FastifyRequest['headers'],
  body: FastifyRequest['body']
) {
  log.trace('parsing cloud event. data: %j', {
    headers,
    body
  });

  const evt = HTTP.toEvent({
    headers,
    body
  });

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
async function processScoreEvent(payload: AttackProcessed | BonusProcessed) {
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
    } else {
      // This can happen if score processing is delayed. The match may have
      // ended by the time the backlog has caught up to notify the player
      log.debug(
        `not sending score update. failed to find socket for player ${payload.uuid}`
      );
    }
  }
}
