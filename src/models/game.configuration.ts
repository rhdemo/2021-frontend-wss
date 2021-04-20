import {
  CLUSTER_NAME,
  DATAGRID_GAME_DATA_KEY,
  GAME_BONUS_DURATION_MS
} from '@app/config';
import Model from './model';

export type GameConfigurationData = {
  uuid: string;
  date: string;
  state: GameState;
  bonusDuration: number;
  cluster: string;
};

export enum GameState {
  Lobby = 'lobby',
  Active = 'active',
  Paused = 'paused',
  Stopped = 'stopped'
}

export default class GameConfiguration extends Model<GameConfigurationData> {
  constructor(id: string, private date: string, private state: GameState) {
    super(id);
  }

  static from(data: GameConfigurationData) {
    return new GameConfiguration(data.uuid, data.date, data.state);
  }

  isInState(state: GameState) {
    return this.state === state;
  }

  getGameState() {
    return this.state;
  }

  getModelKey() {
    return DATAGRID_GAME_DATA_KEY;
  }

  toJSON(): GameConfigurationData {
    return {
      cluster: CLUSTER_NAME,
      uuid: this.getUUID(),
      date: this.date,
      state: this.state,
      bonusDuration: GAME_BONUS_DURATION_MS
    };
  }
}
