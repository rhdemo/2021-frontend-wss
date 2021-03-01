import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync } from 'fs';
import { GAME_GRID_SIZE } from '@app/config';
import {
  Orientation,
  ShipData,
  ShipPositionData,
  ShipSize,
  ShipType
} from '@app/game/types';
import log from '@app/log';
import { validateShipPlacement } from '.';

const writeFilePath = join(tmpdir(), 'all.positions.json');
const ShipLengths = {
  [ShipType.Carrier]: parseInt(ShipSize.Carrier.split('x')[0], 10),
  [ShipType.Battleship]: parseInt(ShipSize.Battleship.split('x')[0], 10),
  [ShipType.Submarine]: parseInt(ShipSize.Submarine.split('x')[0], 10),
  [ShipType.Destroyer]: parseInt(ShipSize.Destroyer.split('x')[0], 10)
};

/**
 * Determine if a ship can fit on the game board in the given orientation, and
 * with it's origin at a given x, y. This ignores any potential for overlap.
 */
function canFitOnBoardInOrientation(
  len: number,
  orientation: Orientation,
  x: number,
  y: number
) {
  if (orientation === Orientation.Horizontal) {
    return x + len <= GAME_GRID_SIZE;
  } else {
    return y + len <= GAME_GRID_SIZE;
  }
}

log.info('generating all possible ship layouts');

const validPositionsForPieceLen: { [key: string]: Array<ShipData> } = {
  [ShipType.Carrier]: [],
  [ShipType.Battleship]: [],
  [ShipType.Submarine]: [],
  [ShipType.Destroyer]: []
};

for (const ship in ShipLengths) {
  for (let x = 0; x < GAME_GRID_SIZE; x++) {
    for (let y = 0; y < GAME_GRID_SIZE; y++) {
      if (
        canFitOnBoardInOrientation(
          ShipLengths[ship as ShipType],
          Orientation.Horizontal,
          x,
          y
        )
      ) {
        validPositionsForPieceLen[ship as ShipType].push({
          origin: [x, y],
          orientation: Orientation.Horizontal
        });
      }
      if (
        canFitOnBoardInOrientation(
          ShipLengths[ship as ShipType],
          Orientation.Vertical,
          x,
          y
        )
      ) {
        validPositionsForPieceLen[ship as ShipType].push({
          origin: [x, y],
          orientation: Orientation.Vertical
        });
      }
    }
  }
}

// Generate all possible ship position combinations. These combinations include
// overlap, but we'll filter out those invalid combinations shortly...
const unvalidatedPositionCombinations: Array<ShipPositionData> = [];
validPositionsForPieceLen[ShipType.Carrier].forEach((five) => {
  validPositionsForPieceLen[ShipType.Battleship].forEach((four) => {
    validPositionsForPieceLen[ShipType.Submarine].forEach((three) => {
      validPositionsForPieceLen[ShipType.Destroyer].forEach((two) => {
        unvalidatedPositionCombinations.push({
          [ShipType.Carrier]: five,
          [ShipType.Battleship]: four,
          [ShipType.Submarine]: three,
          [ShipType.Destroyer]: two
        });
      });
    });
  });
});

// Filter out any invalid, i.e overlapping positions
const validatedCombinations = unvalidatedPositionCombinations.filter(
  (positionData) => {
    let valid = false;
    try {
      validateShipPlacement(positionData);
      valid = true;
    } catch (e) {}

    return valid;
  }
);

log.info(
  `determined that ${validatedCombinations.length} ship layouts are possible`
);
writeFileSync(writeFilePath, JSON.stringify(validatedCombinations, null, 2));
log.info(`wrote all possible layouts to: ${writeFilePath}`);

export function getAllPossibleShipLayouts() {
  return validatedCombinations;
}
