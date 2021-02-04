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
import { AttackResult } from '../sockets/handler.attack';
import log from '../log';

type StoredPositionData = {
  [key in ShipType]: StoredShipData;
};

export type PlayerBoardData = {
  valid: boolean;
  positions: StoredPositionData;
};

export type OpponentData = {
  uuid: string;
  username: string;
  attacks: StoredAttackData;
  board: OpponentBoardData;
};

type OpponentBoardData = {
  [key in ShipType]?: StoredShipData;
};

export type PlayerData = {
  uuid: string;
  username: string;
  match?: string;
  board?: PlayerBoardData;
  attacks: StoredAttackData;
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

export type StoredAttackData = {
  ts: number;
  attack: AttackDataPayload;
  results: AttackResult[];
}[];

export default class Player extends Model<PlayerData> {
  private board: PlayerBoardData | undefined;
  private attacks: StoredAttackData;
  constructor(
    private username: string,
    uuid?: string,
    private match?: string,
    board?: PlayerBoardData,
    attacks?: StoredAttackData
  ) {
    super(uuid);
    if (board) {
      this.board = board;
    }

    if (attacks) {
      this.attacks = attacks;
    } else {
      this.attacks = [];
    }
  }

  static from(data: PlayerData) {
    log.trace('creating player instance from data: %j', data);
    return new Player(
      data.username,
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
    log.info(
      `setting ship position data for player ${this.getUUID()} to: %j`,
      data
    );
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

  hasAttacked() {
    return this.attacks.length > 0;
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

  recordAttack(attack: AttackDataPayload, results: AttackResult[]) {
    this.attacks.push({
      ts: Date.now(),
      attack,
      results
    });
  }

  getUsername() {
    return this.username;
  }

  getMatchInstanceUUID() {
    return this.match;
  }

  /**
   * Generates a JSON object that has secret information redacted. This is
   * necessary since players need to know certain information about their
   * opponent, but we don't want to expose ship locations and other data
   */
  toOpponentJSON(): OpponentData {
    const board: OpponentBoardData = {};
    const positions = this.board?.positions;

    if (positions) {
      Object.keys(positions).forEach((_ship) => {
        const type = _ship as ShipType;
        const ship = positions[type];
        const sunk = ship.cells.reduce(
          (result, cell) => result && cell.hit,
          true
        );

        if (sunk) {
          // If the ship has been sunk expose it in returned data
          board[type] = ship;
        }
      });
    }

    return {
      username: this.username,
      attacks: this.attacks,
      uuid: this.getUUID(),
      board
    };
  }

  toJSON(): PlayerData {
    return {
      board: this.board,
      username: this.username,
      match: this.getMatchInstanceUUID(),
      attacks: this.attacks,
      uuid: this.getUUID()
    };
  }
}

module.exports = Player;
