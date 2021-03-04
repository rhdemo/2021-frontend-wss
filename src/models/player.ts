import { AttackDataPayload } from '@app/payloads/incoming';
import {
  getCellCoverageForOriginOrientationAndArea,
  getRandomShipLayout,
  isSameOrigin
} from '@app/utils';
import {
  CellPosition,
  Orientation,
  ShipSize,
  ShipPositionData,
  ShipType
} from '@app/game/types';
import Model from './model';
import { AttackResult } from '@app/payloads/common';
import log from '@app/log';

/**
 * The location and hit status of a ship cell. A ship will cover multiple cells
 * on the board, so we track them individually over time.
 */
type StoredShipDataCell = {
  origin: CellPosition;
  hit: boolean;
  type: ShipType;
};

/**
 * Player attacks are stored. These are used by the client to render the game
 * board at any point in time.
 */
type StoredAttackData = {
  ts: number;
  attack: AttackDataPayload;
  result: AttackResult;
};

/**
 * The ship data that is stored includes the cells and their current state,
 * i.e if they have been hit by an attack
 */
type StoredShipData = {
  type: ShipType;
  origin: CellPosition;
  orientation: Orientation;
  cells: StoredShipDataCell[];
};

/**
 * Container type to store player ship position data.
 */
type PlayerPositionData = {
  [key in ShipType]: StoredShipData;
};

/**
 * The opponent ship placements (from the perspective of another player) are
 * only revealed after the particular ship has been completely destroyed
 */
type OpponentPositionData = {
  [key in ShipType]?: StoredShipData;
};

/**
 * A player's board data must be validated. So we store it alongside a flag
 * that indicates if it has passed validation.
 */
type PlayerBoardData = {
  valid: boolean;
  positions: PlayerPositionData;
};

/**
 * A representation of the overall Player state. This is the type of data that
 * inifinispan will hold for a Player instance, and is used to instantiate a
 * Player object from cache entries.
 */
export type PlayerData = {
  uuid: string;
  username: string;
  isAi: boolean;
  match?: string;
  board: PlayerBoardData;
  attacks: StoredAttackData[];
};

/**
 * Similar to PlayerData, but contains a sanitised version of data top prevent
 * a nefarious player from getting an upper hand by inspecting packets.
 */
export type OpponentData = {
  uuid: string;
  username: string;
  attacks: StoredAttackData[];
  board: OpponentPositionData;
};

export default class Player extends Model<PlayerData> {
  private board: PlayerBoardData;
  private attacks: StoredAttackData[];
  private username: string;
  private isAi: boolean;
  private match?: string;

  constructor(opts: {
    username: string;
    isAi: boolean;
    uuid?: string;
    match?: string;
    board?: PlayerBoardData;
    attacks?: StoredAttackData[];
  }) {
    super(opts.uuid);

    this.match = opts.match;
    this.attacks = opts.attacks || [];
    this.username = opts.username;
    this.isAi = opts.isAi;

    if (opts.board) {
      this.board = opts.board;
    } else {
      // Create a default set of valid, but not unconfirmed positions. The
      // end-user will need to confirm them via the UI
      this.board = {
        valid: false,
        positions: createPositionDataWithCells(getRandomShipLayout())
      };
    }
  }

  static from(data: PlayerData) {
    log.trace('creating player instance from data: %j', data);
    return new Player(data);
  }

  isAiPlayer() {
    return this.isAi;
  }

  hasAttacked() {
    return this.attacks.length > 0;
  }

  hasAttackedLocation(origin: CellPosition): boolean {
    return !!this.attacks.find((a) => isSameOrigin(a.attack.origin, origin));
  }

  getShipPositionData() {
    return this.board?.positions;
  }

  hasLockedShipPositions() {
    return this.board?.valid;
  }

  setMatchInstanceUUID(uuid: string) {
    log.trace(`setting player ${this.getUUID()} match UUID to ${uuid}`);
    this.match = uuid;
  }

  getUsername() {
    return this.username;
  }

  getMatchInstanceUUID() {
    return this.match;
  }

  /**
   * Return the number of shots that this player has fired so far.
   */
  getShotsFiredCount() {
    return this.attacks.length;
  }

  /**
   * Return the number of successive shots in a row that have been successful
   * hits. This could be zero for most of the game if the player is unfortunate
   * or unattentive.
   */
  getContinuousHitsCount() {
    // Sort the attacks in order of most recent first
    const attacksInTimeOrder = this.attacks
      .slice()
      .sort((a, b) => (a.ts > b.ts ? -1 : 1));

    // Then increase the counter for each successful hit, then break the
    // loop once a miss is detected
    let count = 0;
    for (const atk of attacksInTimeOrder) {
      if (atk.result.hit) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  /**
   * Returns the information for all cells occupied by this player's ships
   */
  private getAllShipCells(): Array<StoredShipDataCell> {
    return Object.keys(this.board.positions).reduce((agg, key) => {
      const shipData = this.board.positions[key as ShipType];

      shipData.cells.forEach((c) => agg.push(c));

      return agg;
    }, [] as Array<StoredShipDataCell>);
  }

  /**
   * Take a validated set on incoming ship positions, initialise them for game
   * logic, and store on this player instance.
   * @param data
   * @param valid
   */
  setShipPositionData(data: ShipPositionData, valid: boolean) {
    log.info(
      `setting ship position data (valid: ${valid}) for player ${this.getUUID()} to: %j`,
      data
    );

    this.board = {
      valid,
      positions: createPositionDataWithCells(data)
    };
  }

  /**
   * Determines if a given attack at an origin will hit/miss. It the attack is
   * deemed to be a hit, it will also determine if it destroyed a ship.
   *
   * This is called if this player is the recipient of an attack.
   */
  determineAttackResult({ origin }: AttackDataPayload): AttackResult {
    const cells = this.getAllShipCells();

    const hitCell = cells.find((c) => isSameOrigin(c.origin, origin));

    if (hitCell) {
      // Mark cell as hit since we need to keep track of this!
      hitCell.hit = true;

      // Determine if this hit was the final one required to sink the ship
      const destroyed = cells
        .filter((c) => c.type === hitCell.type)
        .reduce((_destroyed: boolean, v) => {
          return _destroyed && v.hit;
        }, true);

      return {
        ...hitCell,
        destroyed
      };
    } else {
      return {
        hit: false,
        origin
      };
    }
  }

  /**
   * Records the result of an attack in this player record. This is called if
   * this player was the one making the attack.
   */
  recordAttackResult(attack: AttackDataPayload, result: AttackResult) {
    this.attacks.push({
      ts: Date.now(),
      attack,
      result
    });
  }

  /**
   * Generates a JSON object that has secret information redacted. This is
   * necessary since players need to know certain information about their
   * opponent, but we don't want to expose ship locations and other data
   */
  toOpponentJSON(): OpponentData {
    const board: OpponentPositionData = {};
    const positions = this.board.positions;

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
      attacks: this.attacks.map((a) => {
        const atk = {
          ...a
        };

        // Remove prediction data from outgoing messages
        delete a.attack.prediction;

        return atk;
      }),
      uuid: this.getUUID(),
      board
    };
  }

  /**
   * Returns a JSON object that is used to serialise this Player instance for
   * storage in the infinispan cache, or to be sent via WebSocket
   */
  toJSON(): PlayerData {
    return {
      board: this.board,
      isAi: this.isAi,
      username: this.username,
      match: this.getMatchInstanceUUID(),
      attacks: this.attacks,
      uuid: this.getUUID()
    };
  }
}

/**
 * Take basic ShipPositionData and explode out the cells that each of the
 * provided ships occupy, i.e the x,y coordinates that it covers.
 * @param data
 */
function createPositionDataWithCells(
  data: ShipPositionData
): PlayerPositionData {
  return Object.keys(data).reduce((updated, _type) => {
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
          origin,
          type
        };
      })
    };

    return updated;
  }, {} as PlayerPositionData);
}

module.exports = Player;
