import { HTTP, CloudEvent } from 'cloudevents';
import { CLOUD_EVENT_BROKER_URL } from '@app/config';
import log from '@app/log';
import { ShipType } from '@app/game/types';
import { http } from '@app/utils';
import { HTTPError } from 'got';

const source = 'battleship-wss';

export const enum CloudEventType {
  Hit = 'hit',
  Miss = 'miss',
  Sink = 'sink',
  Win = 'win',
  Lose = 'lose',
  Bonus = 'bonus'
}

export type CloudEventBase = {
  ts: number;
  by: string;
  game: string;
  match: string;
  against: string;
  origin: `${number},${number}`;
};

type HitShotEventData = CloudEventBase & {
  type: ShipType;
};

type MissShotEventData = CloudEventBase;

type SinkEventData = CloudEventBase & {
  type: ShipType;
};

type WinLoseEventData = {
  game: string;
  match: string;
  player: string;
};

function sendEvent(type: CloudEventType, data: unknown) {
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

export function hit(data: HitShotEventData): Promise<void> {
  return sendEvent(CloudEventType.Hit, data);
}

export function miss(data: MissShotEventData): Promise<void> {
  return sendEvent(CloudEventType.Miss, data);
}

export function sink(data: SinkEventData): Promise<void> {
  return sendEvent(CloudEventType.Sink, data);
}

export function win(data: WinLoseEventData): Promise<void> {
  return sendEvent(CloudEventType.Win, data);
}

export function lose(data: WinLoseEventData): Promise<void> {
  return sendEvent(CloudEventType.Lose, data);
}

export function bonus(): Promise<void> {
  return Promise.resolve();
}
