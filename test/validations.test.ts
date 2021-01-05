import test from 'tape';
import { validateShipPlacement } from '../validations';

function getValidShipPlacement(): any {
  return {
    2: {
      position: [0, 0],
      orientation: 'horizontal',
    },
    3: {
      position: [2, 1],
      orientation: 'horizontal',
    },
    4: {
      position: [0, 1],
      orientation: 'vertical',
    },
  };
}

test('successfully validates, and returns an object that matches the original input', (t) => {
  const result = validateShipPlacement(getValidShipPlacement());
  t.deepEqual(result, getValidShipPlacement());
  t.end();
});

test('throws an error for invalid payload data with an extra piece/key', (t) => {
  const placement = getValidShipPlacement();

  placement['5'] = {
    position: [1, 1],
    orientation: 'horizontal',
  };

  try {
    const result = validateShipPlacement(placement);
    t.fail();
  } catch (e) {
    t.match(e.toString(), /\"5\" is not allowed/gi);
    t.end();
  }
});

test('throws an error for invalid payload data with an extra/unknown piece/key', (t) => {
  const placement = getValidShipPlacement();

  placement['5'] = {
    position: [1, 1],
    orientation: 'horizontal',
  };

  try {
    validateShipPlacement(placement);
    t.fail();
  } catch (e) {
    t.match(e.toString(), /\"5\" is not allowed/gi);
    t.end();
  }
});

test('throws an error since a piece/key is missing', (t) => {
  const placement = getValidShipPlacement();

  delete placement[3];

  try {
    validateShipPlacement(placement);
    t.fail();
  } catch (e) {
    t.match(e.toString(), /\"3\" is required/gi);
    t.end();
  }
});

test('throws an error since a piece/key has negative a co-ordinate', (t) => {
  const placement = getValidShipPlacement();

  placement[3].position = [-1, 2];

  try {
    validateShipPlacement(placement);
    t.fail();
  } catch (e) {
    t.match(
      e.toString(),
      /"3.position\[0\]" must be greater than or equal to 0/gi
    );
    t.end();
  }
});

test('throws an error since a piece/key has a co-ordinate(s) greater than grid size', (t) => {
  const placement = getValidShipPlacement();

  placement[3].position = [5, 6];

  try {
    validateShipPlacement(placement);
    t.fail();
  } catch (e) {
    t.match(
      e.toString(),
      /"3.position\[0\]" must be less than or equal to 4/gi
    );
    t.match(
      e.toString(),
      /"3.position\[1\]" must be less than or equal to 4/gi
    );
    t.end();
  }
});

test('throws an error if a ship is hanging over the board edge', (t) => {
  const placement = {
    2: {
      position: [0, 0],
      orientation: 'horizontal',
    },
    3: {
      position: [2, 1],
      orientation: 'horizontal',
    },
    4: {
      // x=3, so a ship of width 4 will be over the edge
      position: [3, 1],
      orientation: 'horizontal',
    },
  };

  try {
    validateShipPlacement(placement);
    t.fail();
  } catch (e) {
    t.match(e.toString(), /a ship is over the edge of the board/gi);
    t.end();
  }
});

test('throws an error if a ship is hanging over the board edge', (t) => {
  const placement = {
    2: {
      position: [0, 0],
      orientation: 'horizontal',
    },
    3: {
      position: [2, 1],
      orientation: 'horizontal',
    },
    4: {
      // This ship will intersect with the one above
      position: [3, 1],
      orientation: 'vertical',
    },
  };

  try {
    validateShipPlacement(placement);
    t.fail();
  } catch (e) {
    t.match(e.toString(), /ships are overlapping at grid \[3, 1\]/gi);
    t.end();
  }
});
