import { AttackDataPayload } from '../sockets/payloads';
import { getCellCoverageForOriginOrientationAndArea } from '../utils';
import {
  CellPosition,
  Orientation,
  ShipSize,
  ShipPositionData,
  ShipType
} from '../validations';
import Model from './model';

type StoredPositionData = {
  [key in ShipType]: StoredShipData;
};

export type PlayerBoardData = {
  valid: boolean;
  positions: StoredPositionData;
};

export type PlayerData = {
  score: number;
  uuid: string;
  username: string;
  match?: string;
  board?: PlayerBoardData;
  attacks?: AttackDataPayload[];
};

export type StoredShipData = {
  type: ShipType;
  origin: CellPosition;
  orientation: Orientation;
  cells: {
    origin: CellPosition;
    hit: boolean;
  }[];
};

export default class Player extends Model<PlayerData> {
  private board: PlayerBoardData | undefined;

  constructor(
    private username: string,
    private score: number,
    uuid?: string,
    private match?: string,
    board?: PlayerBoardData,
    private attacks?: AttackDataPayload[]
  ) {
    super(uuid);
    if (board) {
      this.board = board;
    }
  }

  static from(data: PlayerData) {
    return new Player(
      data.username,
      data.score,
      data.uuid,
      data.match,
      data.board,
      data.attacks
    );
  }

  /**
   * Take a validated set on incoming ship positions, initialise them for game
   * logic, and store on this player instance.
   * @param data
   * @param valid
   */
  setShipPositionData(data: ShipPositionData, valid: boolean) {
    const positions = Object.keys(data).reduce((updated, _type) => {
      const type = _type as ShipType;
      const shipData = data[type];

      const cells = getCellCoverageForOriginOrientationAndArea(
        shipData.origin,
        shipData.orientation,
        ShipSize[type]
      );

      updated[type] = {
        ...shipData,
        type,
        cells: cells.map((origin) => {
          return {
            hit: false,
            origin
          };
        })
      };

      return updated;
    }, {} as StoredPositionData);

    this.board = {
      valid,
      positions
    };
  }

  getShipPositionData() {
    return this.board?.positions;
  }

  hasLockedShipPositions() {
    return this.board?.valid;
  }

  setMatchInstanceUUID(uuid: string) {
    this.match = uuid;
  }

  recordAttack(attack: AttackDataPayload) {
    this.attacks?.push;
  }

  getUsername() {
    return this.username;
  }

  getMatchInstanceUUID() {
    return this.match;
  }

  toJSON(): PlayerData {
    return {
      board: this.board,
      username: this.username,
      score: this.score,
      match: this.getMatchInstanceUUID(),
      attacks: this.attacks,
      uuid: this.getUUID()
    };
  }
}

module.exports = Player;
