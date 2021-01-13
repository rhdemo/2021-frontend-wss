import GameConfiguration, { GameConfigurationData } from './game.configuration';
import Player, { PlayerData } from './player';

export type PlayerConfigurationData = {
  game: GameConfigurationData;
  player: PlayerData;
};

export default class PlayerConfiguration {
  constructor(private game: GameConfiguration, private player: Player) {}

  toJSON(): PlayerConfigurationData {
    return {
      game: this.game.toJSON(),
      player: this.player.toJSON()
    };
  }
}
