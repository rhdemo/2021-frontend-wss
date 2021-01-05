import * as Joi from 'joi'

const enum ShipOrientation {
  Vertical = 'vertical',
  Horizontal = 'horizontal'
}

const enum ShipSize {
  S = 2,
  M = 3,
  L = 4
}

const EXPECT_OCCUPIED_SQUARES = ShipSize.S + ShipSize.M + ShipSize.L

type ShipData = {
  position: [number, number],
  orientation: ShipOrientation
}

type ShipsLockedData = {
  [key in ShipSize]: ShipData
}

const ShipSchema = Joi.object({
  position: Joi.array().min(2).max(2).items(Joi.number().min(0).max(4)).required(),
  orientation: Joi.string().allow(ShipOrientation.Vertical, ShipOrientation.Horizontal).required()
})

const ShipsLockedSchema = Joi.object({
  [ShipSize.S]: ShipSchema.required(),
  [ShipSize.M]: ShipSchema.required(),
  [ShipSize.L]: ShipSchema.required()
})

/**
 * Validate a ship placement payload. Code is not great, not terrible.
 * Refer to the "pieces.locked.json" file, or tests for a sample payload.
 *
 * Steps:
 *
 * 1. JSON payload validation using a schema
 * 2. Generate a 5x5 grid array[][]
 * 3. Verify ships are within bounds
 *
 * @param placementData
 */
export function validateShipPlacement(placementData: unknown): ShipsLockedData {
  const result = ShipsLockedSchema.validate(placementData, {
    abortEarly: false,
    stripUnknown: false,
    allowUnknown: false
  })

  const errors = result.error || result.errors

  if (errors) {
    throw errors
  }

  // Populate a grid and use it to verify that pieces do not overlap
  const grid = generateEmptyGridArray()

  populateGridWithShipData(ShipSize.S, (placementData as ShipsLockedData)[ShipSize.S], grid)
  populateGridWithShipData(ShipSize.M, (placementData as ShipsLockedData)[ShipSize.M], grid)
  populateGridWithShipData(ShipSize.L, (placementData as ShipsLockedData)[ShipSize.L], grid)

  // Prints the 5x5 grid for debugging purposes. It may be wider than 5 cells
  // if a player is sending invalid inputs, or being nefarious
  // populatedGrid.forEach(r => console.log(r))

  // Validate that:
  // 1. ships do not overlap (squares can only contain 0 or 1 values)
  // 2. ships do no stick out over the edges (array must have length 5)
  let occupiedSquares = 0
  for (let i = 0; i < grid.length; i++) {
    const row = grid[i]

    if (row.length !== 5) {
      throw new Error('a ship is over the edge of the board')
    }

    for (let j = 0; j < row.length; j++) {
      const val = row[j]

      if (val > 1) {
        throw new Error(`ships are overlapping at grid [${j}, ${i}]`)
      }

      if (val !== 0) {
        occupiedSquares++
      }
    }
  }

  if (occupiedSquares !== EXPECT_OCCUPIED_SQUARES) {
    throw new Error(`${occupiedSquares} grid positions were occupied, but ${EXPECT_OCCUPIED_SQUARES} was the expected value`)
  }

  return placementData as ShipsLockedData
}


/**
 * Increments the value of squares that a ship occupies in the given 5x5 grid.
 * This grid can be used to find ships that are out of bounds or overlapping.
 *
 * @param s
 * @param piece
 * @param grid
 */
function populateGridWithShipData (s: ShipSize, piece: ShipData, grid: number[][]) {
  const rootX = piece.position[0]
  const rootY = piece.position[1]
  const size = parseInt(s.toString())

  if (isNaN(size)) {
    throw new Error('failed to parse ship size to a number')
  }

  for (let i = 0; i < size; i++) {
    if (piece.orientation === ShipOrientation.Horizontal) {
      const row = rootY
      const col = rootX + i

      grid[row][col] += 1
    } else {
      const row = rootY + i
      const col = rootX

      grid[row][col] += 1
    }
  }
}

function generateEmptyGridArray() {
  return [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0]
  ]
}
