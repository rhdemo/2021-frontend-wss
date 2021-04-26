import { ShipType } from '@app/game/types';
import { PlayerPositionData } from '@app/models/match.player';
import { PredictionData } from '@app/payloads/incoming';

export enum EventType {
  MatchStart = 'match-start',
  Attack = 'attack',
  Bonus = 'bonus',
  MatchEnd = 'match-end'
}

export type CloudEventBase = { game: string; match: string };

export type BasePlayerData = {
  uuid: string;
  username: string;
  human: boolean;
  board?: PlayerPositionData;
};

export type AttackingPlayerData = BasePlayerData & {
  human: boolean;
  consecutiveHitsCount: number;
  shotCount: number;
  prediction?: PredictionData;
};

export type MatchStartEventData = CloudEventBase & {
  playerA: BasePlayerData;
  playerB: BasePlayerData;
};

export type MatchEndEventData = CloudEventBase & {
  winner: BasePlayerData;
  loser: BasePlayerData;
  score?: number;
};

export type AttackEventData = CloudEventBase & {
  hit: boolean;
  by: AttackingPlayerData;
  against: Omit<AttackingPlayerData, 'prediction'>;
  destroyed?: ShipType;
  origin: `${number},${number}`;
};

export type BonusAttackEventData = CloudEventBase & {
  by: Omit<BasePlayerData, 'board'>;
  shots: number;
};
