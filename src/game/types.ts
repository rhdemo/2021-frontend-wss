export enum Orientation {
  Vertical = 'vertical',
  Horizontal = 'horizontal'
}

export enum ShipType {
  Battleship = 'Battleship',
  Destroyer = 'Destroyer',
  Submarine = 'Submarine'
}

export type CellPosition = [number, number];

export enum CellArea {
  '4x1' = '4x1',
  '3x1' = '3x1',
  '2x1' = '2x1',
  '1x1' = '1x1'
}

export type ShipData = {
  origin: CellPosition;
  orientation: Orientation;
};

export type ShipPositionData = {
  [key in ShipType]: ShipData;
};

export type Grid = number[][];

export const ShipSize: { [key in ShipType]: CellArea } = {
  [ShipType.Battleship]: CellArea['4x1'],
  [ShipType.Destroyer]: CellArea['3x1'],
  [ShipType.Submarine]: CellArea['2x1']
};
