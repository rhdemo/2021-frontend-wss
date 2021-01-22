import Model from './model';
import Player from './player';

export type MatchInstanceData = {
  uuid: string;
  ready: boolean;

  // These for the player's "uuid" values, not their usernames
  playerA: string;
  playerB?: string;
};

export default class MatchInstance extends Model<MatchInstanceData> {
  constructor(
    private playerA: string,
    private playerB?: string,
    private ready = false,
    uuid?: string
  ) {
    super(uuid);
  }

  static from(data: MatchInstanceData) {
    return new MatchInstance(data.playerA, data.playerB, data.ready, data.uuid);
  }

  addPlayer(player: Player) {
    if (this.playerB) {
      throw new Error(
        `match ${this.getUUID()} full, cannot add player ${player.getUUID()}`
      );
    }

    this.playerB = player.getUUID();
  }

  isJoinable(): boolean {
    return this.playerB === undefined;
  }

  setMatchReady(ready = true) {
    this.ready = ready;
  }

  getPlayers() {
    const playerA = this.playerA;
    const playerB = this.playerB;
    return {
      playerA,
      playerB
    };
  }

  getPlayerOpponentUUID(player: Player) {
    const playerUUID = player.getUUID();

    if (playerUUID === this.playerA) {
      return this.playerB;
    } else if (playerUUID === this.playerB) {
      return this.playerA;
    } else {
      // This should not happen, but if it does we need to know
      throw new Error(
        `tried to find opponent for player ${playerUUID} in match ${this.getUUID()}, but this player is not associated with this match!`
      );
    }
  }

  toJSON(): MatchInstanceData {
    return {
      uuid: this.getUUID(),
      ready: this.ready,
      playerA: this.playerA,
      playerB: this.playerB
    };
  }
}
