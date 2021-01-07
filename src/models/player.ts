import { ShipsLockedData } from '../validations';

export type PlayerData = {
  score: number;
  username: string;
  shipPositions?: ShipsLockedData;
};

export default class Player {
  constructor(
    private username: string,
    private score: number,
    private shipPositions?: ShipsLockedData
  ) {}

  static from(data: PlayerData) {
    return new Player(data.username, data.score, data.shipPositions);
  }

  setShipPositionData(positions: ShipsLockedData) {
    this.shipPositions = positions;
  }

  toJSON(): PlayerData {
    return {
      shipPositions: this.shipPositions,
      username: this.username,
      score: this.score
    };
  }
}

module.exports = Player;
