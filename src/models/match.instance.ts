import assert from 'assert';
import log from '@app/log';
import Model from './model';
import MatchPlayer, { MatchPlayerData } from './match.player';
import Player, { UnmatchedPlayerData } from './player';
import { ShipType } from '@app/game/types';

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

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
  playerA: MatchPlayerData;
  playerB?: MatchPlayerData;

  state: TurnState;

  // This will be set to the UUID of the winning player at some point
  winner?: string;
};

export type MatchInstanceFrontendData = {
  uuid: string;
  winner?: string;
  state: Optional<TurnState, 'activePlayer'>;
};

export default class MatchInstance extends Model<MatchInstanceData> {
  private state: TurnState;
  private playerA: MatchPlayer;
  private playerB?: MatchPlayer;

  constructor(
    playerA: UnmatchedPlayerData | MatchPlayer,
    playerB?: UnmatchedPlayerData | MatchPlayer,
    state?: TurnState,
    private winner?: string,
    uuid?: string
  ) {
    super(uuid);

    if (playerA instanceof MatchPlayer) {
      this.playerA = playerA;
    } else {
      this.playerA = createMatchPlayerFromPlayerAndMatch(playerA, this);
    }

    if (playerB) {
      if (playerB instanceof MatchPlayer) {
        this.playerB = playerB;
      } else {
        this.playerB = createMatchPlayerFromPlayerAndMatch(playerB, this);
      }
    }

    if (!state) {
      this.state = {
        phase: MatchPhase.NotReady,
        activePlayer:
          playerA instanceof MatchPlayer ? playerA.getUUID() : playerA.uuid
      };
    } else {
      this.state = state;
    }
  }

  static from(data: MatchInstanceData) {
    log.trace('creating match instance from data: %j', data);
    return new MatchInstance(
      MatchPlayer.from(data.playerA),
      data.playerB ? MatchPlayer.from(data.playerB) : undefined,
      data.state,
      data.winner,
      data.uuid
    );
  }

  addPlayer(player: UnmatchedPlayerData) {
    if (this.playerB) {
      throw new Error(
        `match ${this.getUUID()} full, cannot add player ${player.uuid}`
      );
    }

    log.info(`adding player ${player.uuid} to match ${this.getUUID()}`);

    this.playerB = createMatchPlayerFromPlayerAndMatch(player, this);
  }

  isJoinable(): boolean {
    return this.playerB === undefined;
  }

  isInPhase(p: MatchPhase) {
    return this.state.phase === p;
  }

  isPlayerTurn(player: MatchPlayer) {
    return this.state.activePlayer === player.getUUID();
  }

  setMatchReady() {
    this.state.phase = MatchPhase.Attack;
  }

  getMatchPhase() {
    return this.state.phase;
  }

  setWinner(player: MatchPlayer) {
    const uuid = player.getUUID();
    log.info(
      `setting ${uuid} (ai: ${player.isAiPlayer()}) as the winner for match ${this.getUUID()}`
    );
    this.winner = uuid;
    this.state.phase = MatchPhase.Finished;
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

    if (this.state.activePlayer === this.playerA.getUUID() && this.playerB) {
      this.state = {
        phase: MatchPhase.Attack,
        activePlayer: this.playerB.getUUID()
      };
    } else {
      this.state = {
        phase: MatchPhase.Attack,
        activePlayer: this.playerA.getUUID()
      };
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

  getMatchPlayerInstanceByUUID(uuid: string): MatchPlayer | undefined {
    const aUUID = this.playerA.getUUID();
    const bUUID = this.playerB?.getUUID();

    if (uuid === aUUID) {
      return this.playerA;
    } else if (uuid === bUUID) {
      return this.playerB;
    } else {
      // This should not happen, but if it does we need to know
      throw new Error(
        `tried to find player ${uuid} in match ${this.getUUID()}, but only players [${aUUID}, ${bUUID}] are in this match!`
      );
    }
  }

  getPlayerOpponent(player: Player | MatchPlayer): MatchPlayer | undefined {
    const playerUUID = player.getUUID();
    const aUUID = this.playerA.getUUID();
    const bUUID = this.playerB?.getUUID();

    if (playerUUID === aUUID) {
      return this.playerB;
    } else if (playerUUID === bUUID) {
      return this.playerA;
    } else {
      // This should not happen, but if it does we need to know
      throw new Error(
        `tried to find opponent for player ${playerUUID} in match ${this.getUUID()}, but players [${aUUID}, ${bUUID}] are in this match!`
      );
    }
  }

  getPlayerOpponentUUID(player: Player): string | undefined {
    return this.getPlayerOpponent(player)?.getUUID();
  }

  toJSON(): MatchInstanceData {
    return {
      uuid: this.getUUID(),
      playerA: this.playerA.toJSON(),
      playerB: this.playerB?.toJSON(),
      state: this.state,
      winner: this.winner
    };
  }

  /**
   * Formats the match instance data for transmission to the client.
   *
   * We need to remove the activePlayer key if it's not equal to the given
   * player ID. This is because the UUID is treated as a secret...
   *
   * ...we should probably change that -_-
   *
   * @param player
   * @returns
   */
  toFrontendJsonForPlayer(player: string): MatchInstanceFrontendData {
    const data: MatchInstanceFrontendData = {
      uuid: this.getUUID(),
      state: { ...this.state },
      winner: this.winner
    };

    if (data.state.activePlayer !== player) {
      delete data.state.activePlayer;
    }

    return data;
  }
}

function createMatchPlayerFromPlayerAndMatch(
  player: UnmatchedPlayerData,
  match: MatchInstance
): MatchPlayer {
  return new MatchPlayer({
    ...player,
    match: match.getUUID()
  });
}
