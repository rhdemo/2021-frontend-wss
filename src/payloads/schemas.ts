import Joi from 'joi';
import { GAME_GRID_SIZE } from '@app/config';
import { ShipType, Orientation, CellArea } from '@app/game/types';
import { nanoid } from 'nanoid';

export const DEFAULT_JOI_OPTS: Joi.ValidationOptions = {
  stripUnknown: true,
  abortEarly: false
};

export const ManualEventSchema = Joi.object({
  ts: Joi.date()
    .timestamp('javascript')
    .default(() => Date.now()),
  by: Joi.string().default(() => nanoid()),
  game: Joi.string().default(() => nanoid()),
  match: Joi.string().default(() => nanoid()),
  against: Joi.string().default(() => nanoid()),
  type: Joi.string().valid(
    ShipType.Battleship,
    ShipType.Carrier,
    ShipType.Submarine,
    ShipType.Destroyer
  ),
  origin: Joi.string().regex(/[0-4],[0-4]/),
  player: Joi.string().default(() => nanoid())
});

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
  useAiOpponent: Joi.boolean().default(true)
});

export const ShipsLockedPayloadSchema = Joi.object({
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
    .required()
});
