import { ShipsLockedData } from '../validations';
import Model from './model';

export type PlayerData = {
  score: number;
  uuid: string;
  username: string;
  match?: string;
  shipPositions?: ShipsLockedData;
};

export default class Player extends Model<PlayerData> {
  constructor(
    private username: string,
    private score: number,
    uuid?: string,
    private match?: string,
    private shipPositions?: ShipsLockedData
  ) {
    super(uuid);
  }

  static from(data: PlayerData) {
    return new Player(
      data.username,
      data.score,
      data.uuid,
      data.match,
      data.shipPositions
    );
  }

  setShipPositionData(positions: ShipsLockedData) {
    this.shipPositions = positions;
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
      shipPositions: this.shipPositions,
      username: this.username,
      score: this.score,
      match: this.getMatchInstanceUUID(),
      uuid: this.getUUID()
    };
  }
}

module.exports = Player;
