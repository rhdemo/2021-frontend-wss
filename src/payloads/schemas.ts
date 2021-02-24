import Joi from 'joi';
import { GAME_GRID_SIZE } from '@app/config';
import { ShipType, Orientation, CellArea } from '@app/game/types';

export const WsPayloadSchema = Joi.object({
  type: Joi.string().required(),
  data: Joi.object()
});

export const ShipSchema = Joi.object({
  origin: Joi.array()
    .min(2)
    .max(2)
    .items(
      Joi.number()
        .min(0)
        .max(GAME_GRID_SIZE - 1)
    )
    .required(),
  orientation: Joi.string()
    .allow(Orientation.Vertical, Orientation.Horizontal)
    .required()
});

export const ConnectionRequestPayloadSchema = Joi.object({
  username: Joi.string(),
  gameId: Joi.string(),
  playerId: Joi.string(),
  useAiOpponent: Joi.boolean()
});

export const ShipsLockedSchema = Joi.object({
  [ShipType.Battleship]: ShipSchema.required(),
  [ShipType.Carrier]: ShipSchema.required(),
  [ShipType.Destroyer]: ShipSchema.required(),
  [ShipType.Submarine]: ShipSchema.required()
});

export const AttackPayloadSchema = Joi.object({
  type: Joi.string().valid(CellArea['1x1']).required(),
  human: Joi.boolean().default(true),
  origin: Joi.array()
    .min(2)
    .max(2)
    .items(
      Joi.number()
        .min(0)
        .max(GAME_GRID_SIZE - 1)
    )
    .required(),
  orientation: Joi.string()
    .allow(Orientation.Vertical, Orientation.Horizontal)
    .required()
});
