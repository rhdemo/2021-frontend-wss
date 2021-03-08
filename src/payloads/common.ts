import { CellPosition, ShipType } from '@app/game/types';

export type AttackResultBase = {
  hit: boolean;
  origin: CellPosition;
};

export type AttackResultHit = {
  hit: true;
  destroyed: false;
  type: ShipType;
} & AttackResultBase;

export type AttackResultHitDestroy = {
  hit: true;
  destroyed: true;
  type: ShipType;
} & AttackResultBase;

export type AttackResultMiss = {
  hit: false;
} & AttackResultBase;

export type AttackResult =
  | AttackResultHit
  | AttackResultHitDestroy
  | AttackResultMiss;
