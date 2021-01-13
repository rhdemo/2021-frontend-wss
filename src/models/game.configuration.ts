import { InfinispanClient } from 'infinispan';
import { DATAGRID_GAME_DATA_KEY } from '../config';
import Model from './model';

export type GameConfigurationData = {
  uuid: string;
  date: string;
  state: GameState;
};

export enum GameState {
  Lobby = 'lobby',
  Stopped = 'stopped',
  Paued = 'paused',
  Loading = 'loading',
  Active = 'active'
}

export default class GameConfiguration extends Model<GameConfigurationData> {
  constructor(id: string, private date: string, private state: GameState) {
    super(id);
  }

  static from(data: GameConfigurationData) {
    return new GameConfiguration(data.uuid, data.date, data.state);
  }

  getModelKey() {
    return DATAGRID_GAME_DATA_KEY;
  }

  toJSON(): GameConfigurationData {
    return {
      uuid: this.getUUID(),
      date: this.date,
      state: this.state
    };
  }
}
