import Model from './model';
import log from '@app/log';

export type UnmatchedPlayerData = {
  uuid: string;
  username: string;
  isAi: boolean;
};

export type PlayerData = UnmatchedPlayerData & {
  match: string;
};

export default class Player extends Model<PlayerData> {
  private username: string;
  private isAi: boolean;
  private match: string;

  constructor(opts: {
    username: string;
    isAi: boolean;
    uuid?: string;
    match: string;
  }) {
    super(opts.uuid);

    this.match = opts.match;
    this.username = opts.username;
    this.isAi = opts.isAi;
  }

  static from(data: PlayerData) {
    log.trace('creating player instance from data: %j', data);
    return new Player(data);
  }

  isAiPlayer() {
    return this.isAi;
  }

  getUsername() {
    return this.username;
  }

  getMatchInstanceUUID() {
    return this.match;
  }

  setMatchInstanceUUID(uuid: string) {
    this.match = uuid;
  }

  /**
   * Returns a JSON object that is used to serialise this Player instance for
   * storage in the infinispan cache, or to be sent via WebSocket
   */
  toJSON(): PlayerData {
    return {
      isAi: this.isAi,
      username: this.username,
      match: this.match,
      uuid: this.getUUID()
    };
  }
}
