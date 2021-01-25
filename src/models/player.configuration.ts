import GameConfiguration, { GameConfigurationData } from './game.configuration';
import MatchInstance, { MatchInstanceData } from './match.instance';
import Player, { OpponentData, PlayerData } from './player';

export type PlayerConfigurationData = {
  game: GameConfigurationData;
  player: PlayerData;
  match: MatchInstanceData;
  opponent?: OpponentData;
};

export default class PlayerConfiguration {
  constructor(
    private game: GameConfiguration,
    private player: Player,
    private match: MatchInstance,
    private opponent?: Player
  ) {}

  toJSON(): PlayerConfigurationData {
    return {
      opponent: this.opponent?.toOpponentJSON(),
      game: this.game.toJSON(),
      player: this.player.toJSON(),
      match: this.match.toJSON()
    };
  }
}
