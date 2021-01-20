import { ShipPositionData as SPD } from '../validations';

export type ConnectionRequestPayload = {
  username?: string;
  gameId?: string;
  playerId?: string;
};

export type ShipPositionDataPayload = SPD;
