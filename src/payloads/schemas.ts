import Joi from 'joi';
import { GAME_GRID_SIZE, GAME_MAX_BONUS_HITS } from '@app/config';
import { ShipType, Orientation, CellArea } from '@app/game/types';
import { nanoid } from 'nanoid';

const MAX_CELL_NUMBER = GAME_GRID_SIZE - 1;

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
  consecutiveHitsCount: Joi.number().min(0).default(0),
  shotCount: Joi.number().min(0).default(0),
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
    .items(Joi.number().integer().min(0).max(MAX_CELL_NUMBER))
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

  // This is used to determine if the human selected the attack. If this is
  // set to false it means a player didn't choose a move quickly and the
  // frontend JS chose a random attack for them instead. This keeps the game
  // moving at a minimum pace
  human: Joi.boolean().default(true),
  origin: Joi.array()
    .min(2)
    .max(2)
    .items(Joi.number().integer().min(0).max(MAX_CELL_NUMBER))
    .required(),

  // The prediction associated with a score is only stored if the sender is an
  // AI Agent player. A regular player could send it, but we'll ignore it
  prediction: Joi.object({
    // This is a matrix of probability scores for each cell on the board.
    // For example, a 5x5 board might have a prediction matrix like so:
    // [[8,11,12,11,8],[11,14,15,14,11],[12,15,16,15,12],[11,14,15,14,11],[8,11,12,11,8]]
    prob: Joi.array()
      .items(
        Joi.array()
          .items(Joi.number().integer())
          .min(GAME_GRID_SIZE)
          .max(GAME_GRID_SIZE)
      )
      .min(GAME_GRID_SIZE)
      .max(GAME_GRID_SIZE)
      .required(),
    x: Joi.number().integer().min(0).max(MAX_CELL_NUMBER).required(),
    y: Joi.number().integer().min(0).max(MAX_CELL_NUMBER).required()
  })
});

export const BonusPayloadSchema = Joi.object({
  hits: Joi.number().integer().min(0).max(GAME_MAX_BONUS_HITS).required()
});
