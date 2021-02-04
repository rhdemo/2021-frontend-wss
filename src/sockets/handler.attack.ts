import Joi from 'joi';
import WebSocket from 'ws';
import { GAME_GRID_SIZE } from '../config';
import log from '../log';
import * as matchmaking from '../matchmaking';
import * as players from '../players';
import { GameState } from '../models/game.configuration';
import * as ce from '../cloud-events';
import { getCellCoverageForOriginOrientationAndArea } from '../utils';
import {
  CellArea,
  CellPosition,
  isGameOverForPlayer,
  Orientation,
  ShipType
} from '../validations';
import {
  MessageHandler,
  AttackDataPayload,
  OutgoingMsgType,
  ValidationErrorPayload
} from './payloads';
import PlayerConfiguration, {
  PlayerConfigurationData
} from '../models/player.configuration';
import { getPlayerSpecificData, send } from './utils';

export type AttackResult = {
  origin: CellPosition;
  hit: boolean;
  destroyed?: boolean;
  type?: ShipType;
};

type AttackResponse = {
  // UUID of the player that performed the attack
  attacker: string;
  result: AttackResult[];
};

type MergedAttackReponse = AttackResponse & PlayerConfigurationData;

const AttackPayloadSchema = Joi.object({
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

const attackHandler: MessageHandler<
  MergedAttackReponse | ValidationErrorPayload
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
    const wsPlayer = players.getPlayerAssociatedWithSocket(ws);

    if (!wsPlayer) {
      throw new Error('failed to find player associated with this websocket');
    }

    // Despite the fact a player is associated with a socket, we always
    // use the cache as a source of truth. The socket is a lookup reference
    const player = await players.getPlayerWithUUID(wsPlayer.getUUID());
    if (!player) {
      throw new Error('failed to find player data');
    }

    const { game, opponent, match } = await getPlayerSpecificData(player);

    if (game.getGameState() !== GameState.Active) {
      throw new Error(
        `player ${player.getUUID()} cannot attack when game state is "${game.getGameState()}"`
      );
    }

    if (!match) {
      throw new Error(
        `failed to find match associated with player ${player.getUUID()}`
      );
    }

    if (!match.isPlayerTurn(player)) {
      throw new Error(
        `player ${player.getUUID()} attempted to attack, but it's not their turn`
      );
    }

    if (!match.isReady()) {
      throw new Error(
        `player ${player.getUUID()} attempted an attack, but match instance is not ready`
      );
    }

    if (!opponent) {
      throw new Error(
        `no opponent was found in attack handler for player ${player.getUUID()}`
      );
    }

    const opponentShipData = opponent.getShipPositionData();
    if (!opponentShipData) {
      throw new Error(
        `player ${player.getUUID()} opponent (${opponent.getUUID()}) was missing ship position data`
      );
    }

    const attack = validatedData.value as AttackDataPayload;
    const attackCells = getCellCoverageForOriginOrientationAndArea(
      attack.origin,
      attack.orientation,
      attack.type
    );
    const attackResults: AttackResult[] = [];

    log.debug(`determine player ${player.getUUID()} attack hits/misses`);
    log.debug('attack data: %j', attack);
    log.debug('attack cells: %j', attackCells);

    attackCells.forEach((aCell) => {
      // Create a result entry that defaults to miss
      const result: AttackResult = {
        origin: aCell,
        hit: false
      };

      attackResults.push(result);

      Object.keys(opponentShipData).forEach((_ship) => {
        const ship = opponentShipData[_ship as ShipType];
        log.trace(`checking attack %j hit vs ${_ship} cells`, aCell);

        // Determine if the this specific shot hit any ship
        ship.cells.forEach((sCell) => {
          if (aCell[0] === sCell.origin[0] && aCell[1] === sCell.origin[1]) {
            log.trace(`attack on ${_ship} at %j is a hit`, sCell.origin);

            // Mark this ship sell as being hit
            sCell.hit = true;

            // Send a hit cloud event
            ce.hit({
              by: player.getUUID(),
              against: opponent.getUUID(),
              origin: aCell,
              ts: Date.now(),
              match: match.getUUID()
            });

            // Determine if it was the final peg required
            const destroyed = ship.cells.reduce(
              (_destroyed, v) => _destroyed && v.hit,
              true
            );

            // Update the AttackResult object with
            result.hit = true;

            if (destroyed) {
              result.destroyed = true;
              result.type = ship.type;

              // Send a sink cloud event
              ce.sink({
                by: player.getUUID(),
                against: opponent.getUUID(),
                ts: Date.now(),
                type: ship.type,
                match: match.getUUID()
              });
            }
          } else {
            log.trace(`attack on ${_ship} at %j is a miss`, sCell.origin);
            ce.miss({
              by: player.getUUID(),
              against: opponent.getUUID(),
              origin: aCell,
              ts: Date.now(),
              match: match.getUUID()
            });
          }
        });
      });
    });

    log.debug(`player ${player.getUUID()} attack result: %j`, attackResults);

    // Make a record of the attack in the attacking player's record
    player.recordAttack(attack, attackResults);

    // Change who's turn it is next
    match.changeTurn();

    await Promise.all([
      players.upsertPlayerInCache(player),
      players.upsertPlayerInCache(opponent)
    ]);

    if (isGameOverForPlayer(opponent)) {
      log.info(
        `determined that player ${player.getUUID()} lost match ${match.getUUID}`
      );
      // The opponent's ships have all been hit. This player is the winner!
      match.setWinner(player);
    }

    await matchmaking.upsertMatchInCache(match);

    // If the opponent is connected, update with attack results too
    // If they're not connected they'll get updated on reconnect
    const opponentSocket = players.getSocketForPlayer(opponent);
    if (opponentSocket) {
      send(opponentSocket, {
        type: OutgoingMsgType.AttackResult,
        data: {
          result: attackResults,
          attacker: player.getUUID(),
          ...new PlayerConfiguration(game, opponent, match, player).toJSON()
        }
      });
    }

    // Return the attack result to the player
    return {
      type: OutgoingMsgType.AttackResult,
      data: {
        result: attackResults,
        attacker: player.getUUID(),
        ...new PlayerConfiguration(game, player, match, opponent).toJSON()
      }
    };
  }
};

export default attackHandler;
