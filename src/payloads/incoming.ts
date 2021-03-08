import { CellArea, CellPosition, Orientation } from '@app/game/types';

type ProbabilityMatrix = [
  [number, number, number, number, number],
  [number, number, number, number, number],
  [number, number, number, number, number],
  [number, number, number, number, number],
  [number, number, number, number, number]
];

export type PredictionData = {
  prob: ProbabilityMatrix;
  x: number;
  y: number;
};

export enum IncomingMsgType {
  Connection = 'connection',
  ShipPositions = 'ship-positions',
  Attack = 'attack'
}

export type WsPayload = {
  type: IncomingMsgType;
  data: unknown;
};

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
  prediction?: PredictionData;
};
