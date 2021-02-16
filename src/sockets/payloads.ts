import WebSocket from 'ws';
import {
  CellArea,
  CellPosition,
  Orientation,
  ShipPositionData as SPD
} from '../validations';

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

export type ValidationErrorPayload = {
  info: string;
};

export type ShipPositionDataPayload = SPD;

export enum IncomingMsgType {
  Connection = 'connection',
  ShipPositions = 'ship-positions',
  Attack = 'attack'
}

export enum OutgoingMsgType {
  AttackResult = 'attack-result',
  ServerError = 'server-error',
  BadMessageType = 'bad-message-type',
  BadPayload = 'invalid-payload',
  Heartbeat = 'heartbeat',
  Configuration = 'configuration',
  BoardState = 'board-state'
}

export type MessageHandlerResponse<T = unknown> = {
  type: OutgoingMsgType;
  data: T;
};

export type MessageHandler<T> = (
  ws: WebSocket,
  data: unknown
) => Promise<MessageHandlerResponse<T>>;
