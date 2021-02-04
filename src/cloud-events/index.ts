import { HTTP, CloudEvent } from 'cloudevents';
import got from 'got';
import { CLOUD_EVENT_BROKER_URL } from '../config';
import log from '../log';
import { CellPosition, ShipType } from '../validations';

const source = 'battleship-wss';

const enum CloudEventType {
  Hit = 'hit',
  Miss = 'miss',
  Sink = 'sink',
  Bonus = 'bonus'
}

type ShotEventData = {
  ts: number;
  by: string;
  match: string;
  against: string;
  origin: CellPosition;
};

type SinkEventData = {
  ts: number;
  by: string;
  match: string;
  against: string;
  type: ShipType;
};

async function sendEvent(type: CloudEventType, data: unknown) {
  const ce = HTTP.binary(
    new CloudEvent({
      type,
      source,
      data
    })
  );

  log.debug('sending cloud event: %j', ce);

  try {
    const res = await got(CLOUD_EVENT_BROKER_URL, {
      method: 'POST',
      headers: ce.headers,
      body: JSON.stringify(ce.body)
    });

    log.debug(`sent cloud event and received HTTP ${res.statusCode} response`);
  } catch (e) {
    log.error('error sending cloud event:');
    log.error(e);
  }
}

export function hit(data: ShotEventData) {
  sendEvent(CloudEventType.Hit, data);
}

export function miss(data: ShotEventData) {
  sendEvent(CloudEventType.Miss, data);
}

export function sink(data: SinkEventData) {
  sendEvent(CloudEventType.Sink, data);
}

export function bonus() {
  // TODO
}
