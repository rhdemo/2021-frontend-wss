const { writeFileSync } = require("fs")
const { tmpdir } = require("os")
const { join } = require("path")

const SHIP_LENGTHS = [
  5,4,3,2
]

const EXPECTED_OCCUPIED_SQUARES = SHIP_LENGTHS.reduce(
  (total, v) => {
    return total + v
  },
  0
);

const ORIENTATION = {
  H: 'horizontal',
  V: 'vertical'
}

const BOARD_SIZE = 5

function getEmptyBoard () {
  return [
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0]
  ]
}

function canFitOnBoardInOrientation(len, orientation, x, y) {
  if (orientation === ORIENTATION.H) {
    return x + len <= BOARD_SIZE
  } else {
    return y + len <= BOARD_SIZE
  }
}

const validPositionsForPiece = {}

for (let lenIdx = 0; lenIdx < SHIP_LENGTHS.length; lenIdx++) {
  const len = SHIP_LENGTHS[lenIdx]

  validPositionsForPiece[len] = []

  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      if (canFitOnBoardInOrientation(len, ORIENTATION.H, x, y)) {
        validPositionsForPiece[len].push({ len, x, y, o: ORIENTATION.H })
      }
      if (canFitOnBoardInOrientation(len, ORIENTATION.V, x, y)) {
        validPositionsForPiece[len].push({ len, x, y, o: ORIENTATION.V })
      }
    }
  }
}

const unvalidatedPositionCombinations = []
validPositionsForPiece['5'].forEach(five => {
  validPositionsForPiece['4'].forEach(four => {
    validPositionsForPiece['3'].forEach(three => {
      validPositionsForPiece['2'].forEach(two => {
        unvalidatedPositionCombinations.push([
          five, four, three, two
        ])
      })
    })
  })
})

// const validatedCombinations = []

const validatedCombinations = unvalidatedPositionCombinations.filter(config => {
  const board = getEmptyBoard()
  for (const ship of config) {
    const { x, y, len, o } = ship
    for (let i = 0; i < len; i++) {
      let row, col

      if (o === ORIENTATION.H) {
        row = y;
        col = x + i;
      } else {
        row = y + i;
        col = x;
      }

      if (row >= BOARD_SIZE || col >= BOARD_SIZE) {
        throw new Error(`a ship is over the edge of the board`);
      }

      board[row][col] = len;
    }
  }

  let occupiedSquares = 0;
  for (let i = 0; i < board.length; i++) {
    const row = board[i];

    for (let j = 0; j < row.length; j++) {
      const val = row[j];

      if (val !== 0) {
        occupiedSquares++;
      }
    }
  }

  if (occupiedSquares !== EXPECTED_OCCUPIED_SQUARES) {
    return false
  }

  return true
})

const writeFilePath = join(tmpdir(), 'validated-combinations.json')
writeFileSync(writeFilePath, JSON.stringify(validatedCombinations, null, 2))
console.log('written to', writeFilePath)
