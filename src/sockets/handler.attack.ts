import Joi from 'joi';
import WebSocket from 'ws';
import { GAME_GRID_SIZE } from '../config';
import { getGameConfiguration } from '../game';
import log from '../log';
import * as matchmaking from '../matchmaking';
import { GameState } from '../models/game.configuration';
import { getPlayerAssociatedWithSocket, getPlayerWithUUID } from '../players';
import { getCellCoverageForOriginOrientationAndArea } from '../utils';
import { CellArea, CellPosition, Orientation, ShipType } from '../validations';
import {
  MessageHandler,
  AttackDataPayload,
  OutgoingMsgType,
  ValidationErrorPayload
} from './payloads';

type AttackHit = {
  cell: CellPosition;
  hit: boolean;
  destroyed: boolean;
  type: ShipType;
};

type AttackResponse = {
  hits: {
    origin: CellPosition;
    destroyed?: ShipType;
  }[];
};

const AttackPayloadSchema = Joi.object({
  type: Joi.string()
    .valid(CellArea['4x1'], CellArea['3x1'], CellArea['2x1'], CellArea['1x1'])
    .required(),
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

const attackHandler: MessageHandler<
  AttackResponse | ValidationErrorPayload
> = async (ws: WebSocket, data: unknown) => {
  log.debug('processing attack payload: %j', data);
  const validatedData = AttackPayloadSchema.validate(data);

  if (validatedData.error) {
    return {
      type: OutgoingMsgType.BadPayload,
      data: {
        info: validatedData.error.toString()
      }
    };
  } else {
    const player = getPlayerAssociatedWithSocket(ws);
    if (!player) {
      throw new Error(
        'failed to find player data associated with this websocket'
      );
    }

    const game = getGameConfiguration();
    if (game.getGameState() !== GameState.Active) {
      throw new Error(
        `player ${player.getUUID()} cannot attack when game state is "${game.getGameState()}"`
      );
    }

    const match = await matchmaking.getMatchAssociatedWithPlayer(player);
    if (!match) {
      throw new Error(
        `failed to find match associated with player ${player.getUUID()}`
      );
    }

    const opponentUUID = match.getPlayerOpponentUUID(player);
    if (!match.isReady() || !opponentUUID) {
      throw new Error(
        `player ${player.getUUID()} attempted an attack, but match instance is not ready or opponent is missing`
      );
    }

    const opponent = getPlayerWithUUID(opponentUUID);
    if (!opponent) {
      throw new Error(
        `failed to find opponent ${opponentUUID} for player ${player.getUUID()}`
      );
    }

    const opponentShipData = player.getShipPositionData();
    if (!opponentShipData) {
      throw new Error(
        `player ${player.getUUID()} opponent (${opponentUUID}) was missing ship position data`
      );
    }

    const attack = validatedData.value as AttackDataPayload;
    const attackCells = getCellCoverageForOriginOrientationAndArea(
      attack.origin,
      attack.orientation,
      attack.type
    );

    log.debug(`determine player ${player.getUUID()} if attack has hits`);
    log.trace('attack data: %j', attack);

    const atkResult = Object.keys(opponentShipData).reduce((hits, _ship) => {
      const ship = opponentShipData[_ship as ShipType];

      attackCells.forEach((aCell) => {
        ship.cells.forEach((sCell) => {
          if (aCell[0] === sCell.origin[0] && aCell[1] === sCell.origin[1]) {
            log.trace('attack on %j is a hit', aCell);

            // Mark this ship sell as being hit
            sCell.hit = true;

            // Determine if it was the final peg required
            const destroyed = ship.cells.reduce(
              (_destroyed, v) => _destroyed && v.hit,
              true
            );

            hits.push({
              cell: aCell,
              hit: true,
              destroyed,
              type: ship.type
            });
          } else {
            log.trace('attack on %j is a miss', aCell);
          }
        });
      });

      return hits;
    }, [] as AttackHit[]);

    const response = atkResult.reduce(
      (_response, v) => {
        if (v.hit) {
          _response.hits.push({
            origin: v.cell,
            // This is when a player would say "you sunk my battleship!"
            destroyed: v.destroyed ? v.type : undefined
          });
        }

        return _response;
      },
      {
        hits: []
      } as AttackResponse
    );

    // Make a record of the attack
    player.recordAttack(attack);

    return {
      type: OutgoingMsgType.AttackResult,
      data: response
    };
  }
};

export default attackHandler;
