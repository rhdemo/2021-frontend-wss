import { Server } from 'http';
import { CellArea, CellPosition, Orientation } from './validations';
import got, { OptionsOfTextResponseBody } from 'got';
import { Agent } from 'http';

const agent = new Agent({
  // TODO: maybe try the new undici http library?
  // Using keep-alive agents can massively improves performance/throughput
  keepAlive: true
});

export async function http(url: string, opts: OptionsOfTextResponseBody) {
  return got(url, {
    agent: {
      http: agent
    },
    ...opts
  });
}

export function getWsAddressFromServer(server: Server): string {
  const addr = server.address();

  if (typeof addr === 'string') {
    return addr;
  } else {
    return `${addr?.address}:${addr?.port}`;
  }
}

/**
 * Since all areas are rectangles defined with the assumption they are
 * horizontal or square, we can split them and use the X value to determine
 * length and Y for height
 * @param area
 */
export function getCellAreaWidthAndHeight(area: CellArea) {
  const values = area.split('x');
  return {
    x: parseInt(values[0]),
    y: parseInt(values[1])
  };
}

/**
 * This function will return an array containing occupied cell coordinates for
 * an input (typically and attack) given area, origin, and orientation.
 * @param origin
 * @param orientation
 * @param area
 */
export function getCellCoverageForOriginOrientationAndArea(
  origin: CellPosition,
  orientation: Orientation,
  area: CellArea
): CellPosition[] {
  let xMax = parseInt(area.split('x')[0]);
  let yMax = parseInt(area.split('x')[1]);
  const originX = origin[0];
  const originY = origin[1];

  const positions: CellPosition[] = [];

  if (orientation === Orientation.Vertical) {
    let newX = yMax;
    yMax = xMax;
    xMax = newX;
  }

  for (let x = originX; x <= originX + xMax - 1; x++) {
    for (let y = originY; y <= originY + yMax - 1; y++) {
      positions.push([x, y]);
    }
  }

  return positions;
}
