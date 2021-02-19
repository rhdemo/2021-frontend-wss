import { CellArea, CellPosition, Orientation } from '@app/game/types';

export enum IncomingMsgType {
  Connection = 'connection',
  ShipPositions = 'ship-positions',
  Attack = 'attack'
}

export type ConnectionRequestPayload = {
  username?: string;
  gameId?: string;
  playerId?: string;
  useAiOpponent?: boolean;
};

export type AttackDataPayload = {
  human: boolean;
  type: CellArea;
  origin: CellPosition;
  orientation: Orientation;
};
