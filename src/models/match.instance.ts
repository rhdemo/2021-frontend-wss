import assert from 'assert';
import log from '@app/log';
import Model from './model';
import Player from './player';
import { ShipType } from '@app/game/types';

type TurnState = {
  phase: MatchPhase;

  // The player whose UUID is set here is allowed to attack
  activePlayer: string;
  // If the bonus is set to a ship type then the client will
  // trigger a bonus round attack against that ship
  bonus?: ShipType;
};

export enum MatchPhase {
  NotReady = 'not-ready',
  Attack = 'attack',
  Bonus = 'bonus',
  Finished = 'finished'
}

export type MatchInstanceData = {
  uuid: string;

  // These for the player's "uuid" values, not their usernames
  playerA: string;
  playerB?: string;

  state: TurnState;

  // This will be set to the UUID of the winning player at some point
  winner?: string;
};

export default class MatchInstance extends Model<MatchInstanceData> {
  private state: TurnState;

  constructor(
    private playerA: string,
    private playerB?: string,
    state?: TurnState,
    private winner?: string,
    uuid?: string
  ) {
    super(uuid);

    if (!state) {
      this.state = {
        phase: MatchPhase.NotReady,
        activePlayer: playerA
      };
    } else {
      this.state = state;
    }
  }

  static from(data: MatchInstanceData) {
    log.trace('creating match instance from data: %j', data);
    return new MatchInstance(
      data.playerA,
      data.playerB,
      data.state,
      data.winner,
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

  isInPhase(p: MatchPhase) {
    return this.state.phase === p;
  }

  isPlayerTurn(player: Player) {
    return this.state.activePlayer === player.getUUID();
  }

  setMatchReady(ready = true) {
    this.state.phase = MatchPhase.Attack;
  }

  getMatchPhase() {
    return this.state.phase;
  }

  setWinner(player: Player) {
    const uuid = player.getUUID();
    log.info(`setting ${uuid} as the winner for match ${this.getUUID()}`);
    this.winner = uuid;
  }

  startBonusRound(type: ShipType) {
    this.state.phase = MatchPhase.Bonus;
    this.state.bonus = type;
  }

  changeTurn() {
    if (!this.playerB) {
      assert('changeTurn() was called, but playerB is missing');
    }

    if (this.getMatchPhase() === MatchPhase.NotReady) {
      assert('changeTurn() was called, but match is not yet ready');
    }

    if (this.state.activePlayer === this.playerA && this.playerB) {
      this.state = { phase: MatchPhase.Attack, activePlayer: this.playerB };
    } else {
      this.state = { phase: MatchPhase.Attack, activePlayer: this.playerA };
    }

    log.trace(
      `changed turn for match ${this.getUUID()}. match state is ${this.state}`
    );
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
      playerA: this.playerA,
      playerB: this.playerB,
      state: this.state,
      winner: this.winner
    };
  }
}
