import { HTTP, CloudEvent } from 'cloudevents';
import { CLOUD_EVENT_BROKER_URL } from '@app/config';
import log from '@app/log';
import { ShipType } from '@app/game/types';
import { http } from '@app/utils';
import { HTTPError } from 'got';

const source = 'battleship-wss';

export enum EventType {
  Hit = 'hit',
  Miss = 'miss',
  Sink = 'sink',
  Win = 'win',
  Lose = 'lose',
  Bonus = 'bonus'
}

export type ShotEventData = {
  ts: number;
  by: string;
  game: string;
  match: string;
  against: string;
  origin: `${number},${number}`;
  human: boolean;
  consecutiveHitsCount: number;
  shotCount: number;
};

type WinLoseEventData = {
  human: boolean;
  game: string;
  match: string;
  player: string;
  shotCount: number;
};

/**
 * Fire and forget function for Cloud Events over HTTP.
 * Errors are handled and logged, but do not propagate.
 * @param type
 * @param data
 */
function sendEvent(type: EventType, data: unknown) {
  const ce = HTTP.binary(
    new CloudEvent({
      type,
      source,
      data
    })
  );
  log.debug('sending cloud event: %j', ce);

  return http(CLOUD_EVENT_BROKER_URL, {
    method: 'POST',
    headers: ce.headers,
    body: JSON.stringify(ce.body)
  })
    .then((res) => {
      log.debug(
        `sent cloud event and received HTTP ${res.statusCode} response`
      );
    })
    .catch((e) => {
      log.error('error sending cloud event:');
      log.error(e);

      if (e instanceof HTTPError) {
        log.error('error response body was: %s', e.response.body);
      }
    });
}

export function hit(data: ShotEventData & { type: ShipType }): Promise<void> {
  return sendEvent(EventType.Hit, data);
}

export function miss(data: ShotEventData): Promise<void> {
  return sendEvent(EventType.Miss, data);
}

export function sink(data: ShotEventData & { type: ShipType }): Promise<void> {
  return sendEvent(EventType.Sink, data);
}

export function win(data: WinLoseEventData): Promise<void> {
  return sendEvent(EventType.Win, data);
}

export function lose(data: WinLoseEventData): Promise<void> {
  return sendEvent(EventType.Lose, data);
}

export function bonus(): Promise<void> {
  return Promise.resolve();
}
