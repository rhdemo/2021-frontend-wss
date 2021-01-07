import Player, { PlayerData } from './player';

export enum GameState {
  LOBBY = 'lobby',
  STOPPED = 'stopped',
  PAUSED = 'paused',
  LOADING = 'loading',
  ACTIVE = 'active'
}

export type GameConfigurationData = {
  gameState: GameState;
  gameId: string;
  player: PlayerData;
};

export default class GameConfiguration {
  constructor(
    private gameState: GameState,
    private gameId: string,
    private player: Player
  ) {}

  toJSON(): GameConfigurationData {
    return {
      gameId: this.gameId,
      gameState: this.gameState,
      player: this.player.toJSON()
    };
  }
}
