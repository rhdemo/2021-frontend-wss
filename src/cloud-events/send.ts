import { HTTP, CloudEvent } from 'cloudevents';
import {
  CLOUD_EVENT_BROKER_URL,
  CLOUD_EVENT_DISABLED,
  HOSTNAME,
  CLOUD_EVENT_WARN_THRESHOLD,
  SCORING_SERVICE_URL
} from '@app/config';
import log from '@app/log';
import { http } from '@app/utils';
import { HTTPError } from 'got';
import MatchPlayer from '@app/models/match.player';
import { PredictionData } from '@app/payloads/incoming';
import GameConfiguration from '@app/models/game.configuration';
import MatchInstance from '@app/models/match.instance';
import { AttackResult } from '@app/payloads/common';
import {
  EventType,
  AttackEventData,
  MatchEndEventData,
  MatchStartEventData,
  BonusAttackEventData,
  AttackingPlayerData,
  BasePlayerData
} from './types';
import { send as sendToKafka } from '@app/kafka';

const source = 'battleship-wss';

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
  const payload = { ...data, ts, hostname: HOSTNAME };
  const ce = HTTP.binary(
    new CloudEvent({
      type,
      partitionkey: `${data.game}:${data.match}`,
      source,
      data: payload
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
      const start = Date.now();
      const body = JSON.stringify(ce.body);
      const res = await http(CLOUD_EVENT_BROKER_URL, {
        method: 'POST',
        headers: ce.headers,
        body
      });
      log.debug(
        `sent cloud event and received HTTP ${res.statusCode} response`
      );
      const reqTime = Date.now() - start;

      if (reqTime >= CLOUD_EVENT_WARN_THRESHOLD) {
        log.warn(
          `sending a "${type}" to the cloud event broker took ${reqTime}ms`
        );
      }
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
  playerA: MatchPlayer,
  playerB: MatchPlayer
): Promise<void> {
  const evt: MatchStartEventData = {
    game: game.getUUID(),
    match: match.getUUID(),
    playerA: toBasePlayerData(playerA),
    playerB: toBasePlayerData(playerB)
  };
  const type = EventType.MatchStart;

  sendToKafka(type, evt);
  return sendEvent(type, evt);
}

export function attack(
  game: GameConfiguration,
  match: MatchInstance,
  by: MatchPlayer,
  against: MatchPlayer,
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
  const type = EventType.Attack;

  if (attackResult.hit && attackResult.destroyed) {
    evt.destroyed = attackResult.type;
  }

  sendToKafka(type, evt);

  // Knative events don't require the board, so remove it
  delete evt.by.board;
  delete evt.against.board;

  return sendEvent(type, evt);
}

export function bonus(
  game: GameConfiguration,
  match: MatchInstance,
  player: MatchPlayer,
  shots: number
): Promise<void> {
  const evt: BonusAttackEventData = {
    game: game.getUUID(),
    match: match.getUUID(),
    by: {
      username: player.getUsername(),
      uuid: player.getUUID(),
      human: !player.isAiPlayer()
    },
    shots
  };

  return sendEvent(EventType.Bonus, evt);
}

export async function matchEnd(
  game: GameConfiguration,
  match: MatchInstance,
  winner: MatchPlayer,
  loser: MatchPlayer
): Promise<void> {
  const score = await getScore(
    game.getUUID(),
    match.getUUID(),
    winner.getUUID()
  );
  const evt: MatchEndEventData = {
    game: game.getUUID(),
    match: match.getUUID(),
    winner: toBasePlayerData(winner),
    loser: toBasePlayerData(loser),
    score
  };
  const type = EventType.MatchEnd;

  sendToKafka(type, evt);

  return sendEvent(EventType.MatchEnd, evt);
}

/**
 * Utility function to create an AttackingPlayerData structured type.
 * @param player
 * @param prediction
 */
function toAttackingPlayerData(
  player: MatchPlayer,
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
function toBasePlayerData(player: MatchPlayer): BasePlayerData {
  return {
    username: player.getUsername(),
    uuid: player.getUUID(),
    human: !player.isAiPlayer(),
    board: player.getShipPositionData()
  };
}

function getScore(
  gameId: string,
  matchId: string,
  playerId: string
): Promise<number> {
  // /scoring/{gameId}/{matchId}/{userId}/score
  const path = `scoring/${gameId}/${matchId}/${playerId}/score`;
  const url = new URL(path, SCORING_SERVICE_URL);

  return http(url.toString(), {})
    .then((res) => JSON.parse(res.body).score as number)
    .catch((e) => {
      log.error(`error fetching score for: ${path}`);
      log.error(e);
      return 0;
    });
}
