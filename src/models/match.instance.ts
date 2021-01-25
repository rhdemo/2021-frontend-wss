import { assert } from 'console';
import Model from './model';
import Player from './player';

export type MatchInstanceData = {
  uuid: string;
  ready: boolean;

  // These for the player's "uuid" values, not their usernames
  playerA: string;
  playerB?: string;

  // The player whose UUID is set here is active
  activePlayer: string;
};

export default class MatchInstance extends Model<MatchInstanceData> {
  private activePlayer: string;
  constructor(
    private playerA: string,
    private playerB?: string,
    activePlayer?: string,
    private ready = false,
    uuid?: string
  ) {
    super(uuid);

    // Default the active player to playerA
    this.activePlayer = playerA;
  }

  static from(data: MatchInstanceData) {
    return new MatchInstance(
      data.playerA,
      data.playerB,
      data.activePlayer,
      data.ready,
      data.uuid
    );
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

  isPlayerTurn(player: Player) {
    return this.activePlayer === player.getUUID();
  }

  setMatchReady(ready = true) {
    this.ready = ready;
  }

  isReady() {
    return this.ready;
  }

  changeTurn() {
    if (!this.playerB) {
      assert('changeTurn() was called, but playerB is missing');
    }

    if (!this.isReady()) {
      assert('changeTurn() was called, but match is not yet ready');
    }

    if (this.activePlayer === this.playerA && this.playerB) {
      this.activePlayer = this.playerB;
    } else {
      this.activePlayer = this.playerA;
    }
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
      playerB: this.playerB,
      activePlayer: this.activePlayer
    };
  }
}
