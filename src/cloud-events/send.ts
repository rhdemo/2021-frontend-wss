import { HTTP, CloudEvent } from 'cloudevents';
import { CLOUD_EVENT_BROKER_URL, CLOUD_EVENT_DISABLED } from '@app/config';
import log from '@app/log';
import { ShipType } from '@app/game/types';
import { http } from '@app/utils';
import { HTTPError } from 'got';
import Player, { PlayerPositionData } from '@app/models/player';
import { PredictionData } from '@app/payloads/incoming';
import GameConfiguration from '@app/models/game.configuration';
import MatchInstance from '@app/models/match.instance';
import { AttackResult } from '@app/payloads/common';

const source = 'battleship-wss';

export enum EventType {
  MatchStart = 'match-start',
  Attack = 'attack',
  Bonus = 'bonus',
  MatchEnd = 'match-end'
}

type EventBase = { game: string; match: string };

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
  destroyed?: ShipType;
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
async function sendEvent(
  type: EventType,
  data:
    | AttackEventData
    | MatchEndEventData
    | MatchStartEventData
    | BonusAttackEventData
) {
  const ts = Date.now();
  const ce = HTTP.binary(
    new CloudEvent({
      type,
      source,
      data: { ...data, ts }
    })
  );

  if (CLOUD_EVENT_DISABLED) {
    return log.debug(
      'skipping cloud event send due to CLOUD_EVENT_DISABLED=true'
    );
  } else {
    log.debug(`sending "${type}" cloud event with data: %j`, data);
    log.trace('cloud event formatted: %j', {
      headers: ce.headers,
      body: ce.body
    });

    try {
      const res = await http(CLOUD_EVENT_BROKER_URL, {
        method: 'POST',
        headers: ce.headers,
        body: JSON.stringify(ce.body)
      });
      log.debug(
        `sent cloud event and received HTTP ${res.statusCode} response`
      );
    } catch (e) {
      log.error('error sending cloud event:');
      log.error(e);

      if (e instanceof HTTPError) {
        log.error('error response body was: %s', e.response.body);
      }
    }
  }
}

export function matchStart(
  game: GameConfiguration,
  match: MatchInstance,
  playerA: Player,
  playerB: Player
): Promise<void> {
  const evt: MatchStartEventData = {
    game: game.getUUID(),
    match: match.getUUID(),
    playerA: toBasePlayerData(playerA),
    playerB: toBasePlayerData(playerB)
  };

  return sendEvent(EventType.MatchStart, evt);
}

export function attack(
  game: GameConfiguration,
  match: MatchInstance,
  by: Player,
  against: Player,
  attackResult: AttackResult,
  prediction?: PredictionData
): Promise<void> {
  const evt: AttackEventData = {
    game: game.getUUID(),
    hit: attackResult.hit,
    origin: `${attackResult.origin[0]},${attackResult.origin[1]}` as const,
    match: match.getUUID(),
    by: toAttackingPlayerData(by, prediction),
    against: toAttackingPlayerData(against, prediction)
  };

  if (attackResult.hit && attackResult.destroyed) {
    evt.destroyed = attackResult.type;
  }

  return sendEvent(EventType.Attack, evt);
}

export function bonus(
  game: GameConfiguration,
  match: MatchInstance,
  player: Player,
  bonusHitsCount: number
): Promise<void> {
  const evt: BonusAttackEventData = {
    game: game.getUUID(),
    match: match.getUUID(),
    by: player.getUUID(),
    bonusHitsCount
  };

  return sendEvent(EventType.Attack, evt);
}

export function matchEnd(
  game: GameConfiguration,
  match: MatchInstance,
  winner: Player,
  loser: Player
): Promise<void> {
  const evt: MatchEndEventData = {
    game: game.getUUID(),
    match: match.getUUID(),
    winner: toBasePlayerData(winner),
    loser: toBasePlayerData(loser)
  };

  return sendEvent(EventType.MatchEnd, evt);
}

/**
 * Utility function to create an AttackingPlayerData structured type.
 * @param player
 * @param prediction
 */
function toAttackingPlayerData(
  player: Player,
  prediction?: PredictionData
): AttackingPlayerData {
  return {
    consecutiveHitsCount: player.getContinuousHitsCount(),
    shotCount: player.getShotsFiredCount(),
    prediction,
    ...toBasePlayerData(player)
  };
}

/**
 * Utility function to create an BasePlayerData structured type.
 * @param player
 */
function toBasePlayerData(player: Player): BasePlayerData {
  return {
    username: player.getUsername(),
    uuid: player.getUUID(),
    human: !player.isAiPlayer(),
    board: player.getShipPositionData()
  };
}
