import { ShipPositionData } from '../validations';
import Model from './model';

export type PlayerBoardData = {
  valid: boolean;
  positions: ShipPositionData;
};

export type PlayerData = {
  score: number;
  uuid: string;
  username: string;
  match?: string;
  board?: PlayerBoardData;
};

export default class Player extends Model<PlayerData> {
  private board: PlayerBoardData | undefined;

  constructor(
    private username: string,
    private score: number,
    uuid?: string,
    private match?: string,
    board?: PlayerBoardData
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
      data.board
    );
  }

  setShipPositionData(positions: ShipPositionData, valid: boolean) {
    this.board = {
      valid,
      positions
    };
  }

  hasLockedShipPositions() {
    return this.board?.valid;
  }

  setMatchInstanceUUID(uuid: string) {
    this.match = uuid;
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
      uuid: this.getUUID()
    };
  }
}

module.exports = Player;
