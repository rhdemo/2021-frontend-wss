import { HOSTNAME, SCORING_SERVICE_URL, CLOUD_EVENT_WARN_THRESHOLD } from '@app/config';
import log from '@app/log';
import { OutgoingMsgType } from '@app/payloads/outgoing';
import { getSocketDataContainerByPlayerUUID } from '@app/sockets/player.sockets';
import { http } from '@app/utils';
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

      const total = await getUserScoreTotal(payload);

      container.send({
        type: OutgoingMsgType.ScoreUpdate,
        data: {
          delta: payload.delta,
          total
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

/**
 * Fetch the user's score total from the scoring service.
 * If the lookup fails, then log the error and return undefined
 * @param payload
 * @returns
 */
function getUserScoreTotal(
  payload: AttackProcessed | BonusProcessed
): Promise<number | void> {
  const path = `/scoring/${payload.game}/${payload.match}/${payload.uuid}/score`;
  const startTs = Date.now()

  return http(new URL(path, SCORING_SERVICE_URL).toString(), { method: 'GET' })
    .then((res) => {
      const reqTime = Date.now() - startTs

      if (reqTime > CLOUD_EVENT_WARN_THRESHOLD) {
        log.warn(`score service took ${reqTime}ms to respond to score query`)
      }

      try {
        return JSON.parse(res.body).score;
      } catch (e) {
        log.error('failed to parse score server response: %s', res.body);
        log.error(e);
        return;
      }
    })
    .catch((e) => {
      log.error(`failed to fetch score total for path ${path}. error:`);
      log.error(e);
    });
}
