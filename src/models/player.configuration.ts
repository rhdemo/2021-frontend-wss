import GameConfiguration, { GameConfigurationData } from './game.configuration';
import MatchInstance, { MatchInstanceFrontendData } from './match.instance';
import MatchPlayer, {
  MatchOpponentData,
  MatchPlayerData
} from './match.player';

export type PlayerConfigurationData = {
  game: GameConfigurationData;
  player: MatchPlayerData;
  match: MatchInstanceFrontendData;
  opponent?: MatchOpponentData;
};

export default class PlayerConfiguration {
  constructor(
    private game: GameConfiguration,
    private player: MatchPlayer,
    private match: MatchInstance
  ) {}

  toJSON(): PlayerConfigurationData {
    const opponent = this.match.getPlayerOpponent(this.player);

    return {
      opponent: opponent?.toOpponentJSON(),
      game: this.game.toJSON(),
      player: this.player.toJSON(),
      match: this.match.toFrontendJsonForPlayer(this.player.getUUID())
    };
  }
}
