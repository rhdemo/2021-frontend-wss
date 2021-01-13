import Model from './model';
import Player from './player';

export type MatchInstanceData = {
  uuid: string;

  // These for the player's "uuid" values, not their usernames
  playerA: string;
  playerB?: string;
};

export default class MatchInstance extends Model<MatchInstanceData> {
  constructor(
    private playerA: string,
    private playerB?: string,
    uuid?: string
  ) {
    super(uuid);
  }

  static from(data: MatchInstanceData) {
    return new MatchInstance(data.playerA, data.playerB, data.uuid);
  }

  addPlayer(player: Player) {
    this.playerB = player.getUUID();
  }

  isJoinable(): boolean {
    console.log('joinable', this.playerB === undefined);
    return this.playerB === undefined;
  }

  toJSON(): MatchInstanceData {
    return {
      uuid: this.getUUID(),
      playerA: this.playerA,
      playerB: this.playerB
    };
  }
}
