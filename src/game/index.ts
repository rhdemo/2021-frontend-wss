import { GAME_GRID_SIZE } from '@app/config';
import log from '@app/log';
import MatchPlayer from '@app/models/match.player';
import {
  ShipType,
  ShipSize,
  ShipData,
  Grid,
  ShipPositionData,
  Orientation,
  CellArea
} from './types';
import { validators } from '@app/payloads/jsonschema'
import ValidationError from 'ajv/dist/runtime/validation_error';

const EXPECTED_OCCUPIED_SQUARES: number = Object.values(ShipSize).reduce(
  (total, v) => {
    return total + parseInt(v.split('x')[0], 10);
  },
  0
);

/**
 * Since all areas are rectangles defined with the assumption they are
 * horizontal or square, we can split them and use the X value to determine
 * length and Y for height
 * @param area
 */
export function getCellAreaWidthAndHeight(area: CellArea) {
  const values = area.split('x');
  return {
    x: parseInt(values[0], 10),
    y: parseInt(values[1], 10)
  };
}

/**
 * Validate a ship placement payload. Code is not great, not terrible.
 * Refer to the "pieces.locked.json" file, or tests for a sample payload.
 *
 * Steps:
 *
 * 1. JSON payload validation using a schema
 * 2. Generate a NxN grid array[][]
 * 3. Verify ships are within bounds
 *
 * @param placementData
 */
export function validateShipPlacement(
  placementData: unknown
): ShipPositionData {
  const valid = validators['ship-positions'](placementData);

  if (!valid) {
    throw new ValidationError(validators['ship-positions'].errors || []);
  }

  // Cast the data to the correct type now that Joi validated it, then use it
  // to populate a grid using the keys (ship types) from the validated payload
  const validatedPlacementData = placementData as ShipPositionData;
  const grid = generateEmptyGridArray();

  Object.keys(validatedPlacementData).forEach((ship) => {
    const shipType = ship as ShipType;

    populateGridWithShipData(
      getCellAreaWidthAndHeight(ShipSize[shipType]).x,
      validatedPlacementData[shipType],
      grid
    );
  });

  // Prints the NxN grid for debugging purposes. It may be wider than N cells
  // if a player is sending invalid inputs, or being nefarious
  // grid.forEach(r => console.log(r))

  // Validate that ships do not overlap (square can only contain a 0 or 1)
  let occupiedSquares = 0;
  for (let i = 0; i < grid.length; i++) {
    const row = grid[i];

    for (let j = 0; j < row.length; j++) {
      const val = row[j];

      if (val > 1) {
        throw new Error(`ships are overlapping at grid [${j}, ${i}]`);
      }

      if (val !== 0) {
        occupiedSquares++;
      }
    }
  }

  if (occupiedSquares !== EXPECTED_OCCUPIED_SQUARES) {
    throw new Error(
      `${occupiedSquares} grid positions were occupied, but ${EXPECTED_OCCUPIED_SQUARES} was the expected value`
    );
  }

  return placementData as ShipPositionData;
}

/**
 * Increments the value of squares that a ship occupies in the given NxN grid.
 * This grid can be used to find ships that are out of bounds or overlapping.
 * @param size
 * @param ship
 * @param grid
 */
function populateGridWithShipData(size: number, ship: ShipData, grid: Grid) {
  const rootX = ship.origin[0];
  const rootY = ship.origin[1];

  if (isNaN(size)) {
    throw new Error('failed to parse ship size to a number');
  }

  for (let i = 0; i < size; i++) {
    let row: number;
    let col: number;

    if (ship.orientation === Orientation.Horizontal) {
      row = rootY;
      col = rootX + i;
    } else {
      row = rootY + i;
      col = rootX;
    }

    if (row >= GAME_GRID_SIZE || col >= GAME_GRID_SIZE) {
      throw new Error(`a ship is over the edge of the board`);
    }

    grid[row][col] += 1;
  }
}

/**
 * Determines if the given player has lost the game, i.e all their ships
 * cells have been hit, and thus all their ships are destroyed
 * @param {Player} player
 */
export function isGameOverForPlayer(player: MatchPlayer): boolean {
  const positions = player.getShipPositionData();

  log.trace(
    `checking if player ${player.getUUID()} lost match. ships: %j`,
    positions
  );

  if (!positions) {
    return false;
  } else {
    return Object.values(positions).every((s) => s.sunk === true);
  }
}

/**
 * Generates an empty (filled with zeroes) 2D grid that's NxN in size
 */
function generateEmptyGridArray(): Grid {
  const grid: Grid = [];

  for (let i = 0; i < GAME_GRID_SIZE; i++) {
    grid[i] = [];

    for (let j = 0; j < GAME_GRID_SIZE; j++) {
      grid[i][j] = 0;
    }
  }

  return grid;
}
