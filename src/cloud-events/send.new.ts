import { HTTP, CloudEvent } from 'cloudevents';
import { CLOUD_EVENT_BROKER_URL } from '@app/config';
import log from '@app/log';
import { ShipType } from '@app/game/types';
import { http } from '@app/utils';
import { HTTPError } from 'got';
import { PlayerPositionData } from '@app/models/player';
import { PredictionData } from '@app/payloads/incoming';

const source = 'battleship-wss';

export enum EventType {
  MatchStart = 'match-start',
  Attack = 'attack',
  Bonus = 'bonus',
  MatchEnd = 'match-end'
}

type EventBase = { ts: number; game: string; match: string };

type BasePlayerData = {
  uuid: string;
  username: string;
  human: boolean;
  board: PlayerPositionData;
};

type AttackingPlayerData = BasePlayerData & {
  human: boolean;
  consecutiveHitsCount: number;
  shotCount: number;
  prediction?: PredictionData;
};

type MatchStartEventData = EventBase & {
  playerA: BasePlayerData;
  playerB: BasePlayerData;
};

type MatchEndEventData = EventBase & {
  winner: BasePlayerData;
  loser: BasePlayerData;
};

type AttackEventData = EventBase & {
  hit: boolean;
  by: AttackingPlayerData;
  against: Omit<AttackingPlayerData, 'prediction'>;
  destroyed: ShipType;
  origin: `${number},${number}`;
};

type BonusAttackEventData = EventBase & {
  by: string;
  bonusHitsCount: number;
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

export function matchStart(evt: MatchStartEventData): Promise<void> {
  return sendEvent(EventType.MatchStart, evt);
}

export function attack(evt: AttackEventData): Promise<void> {
  return sendEvent(EventType.Attack, evt);
}

export function bonus(evt: BonusAttackEventData): Promise<void> {
  return sendEvent(EventType.Attack, evt);
}

export function matchEnd(evt: MatchEndEventData): Promise<void> {
  return sendEvent(EventType.MatchEnd, evt);
}
