import { CellPosition, ShipType } from '@app/game/types';

export type AttackResultHit = {
  origin: CellPosition;
  hit: true;
  destroyed: boolean;
  type: ShipType;
};

export type AttackResultMiss = {
  origin: CellPosition;
  hit: false;
};

export type AttackResult = AttackResultHit | AttackResultMiss;
