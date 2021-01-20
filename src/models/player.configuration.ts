import GameConfiguration, { GameConfigurationData } from './game.configuration';
import MatchInstance, { MatchInstanceData } from './match.instance';
import Player, { PlayerData } from './player';

export type PlayerConfigurationData = {
  game: GameConfigurationData;
  player: PlayerData;
  match: MatchInstanceData;
};

export default class PlayerConfiguration {
  constructor(
    private game: GameConfiguration,
    private player: Player,
    private match: MatchInstance
  ) {}

  toJSON(): PlayerConfigurationData {
    return {
      game: this.game.toJSON(),
      player: this.player.toJSON(),
      match: this.match.toJSON()
    };
  }
}
