import { MessageHandler } from './common';
import {
  OutgoingMsgType,
  ValidationErrorPayload
} from '@app/payloads/outgoing';
import PlayerConfiguration, {
  PlayerConfigurationData
} from '@app/models/player.configuration';
import PlayerSocketDataContainer from './player.socket.container';
import { createMatchInstanceWithData } from '@app/stores/matchmaking';
import {
  generateNewPlayerData,
  upsertPlayerInCache
} from '@app/stores/players';
import Player from '@app/models/player';
import { createAiOpponentAgent } from '@app/utils';
import { getGameConfiguration } from '@app/stores/game';

const newMatchHandler: MessageHandler<
  Record<string, unknown>,
  PlayerConfigurationData | ValidationErrorPayload
> = async (container: PlayerSocketDataContainer) => {
  const player = container.getPlayer();
  const game = getGameConfiguration();
  if (!player) {
    throw new Error(
      'no player associated with websocket for new match request'
    );
  }

  // Reuse the existing player data, since we want to assign a new match
  // while retaining their identity across matches
  const playerData = {
    uuid: player.getUUID(),
    username: player.getUsername(),
    isAi: false
  };

  // Create a brand new AI opponent
  const opponentData = generateNewPlayerData({ ai: true });

  // Create new match instance using the existing player and new AI opponent data
  const match = await createMatchInstanceWithData(playerData, opponentData);
  const matchPlayer = match.getMatchPlayerInstanceByUUID(player.getUUID());

  if (!matchPlayer) {
    throw new Error(
      'assigning player to new match failed. player was not correctly assigned to new match instance'
    );
  }

  // Assign the player to this new match
  player.setMatchInstanceUUID(match.getUUID());

  // Update the existing player and write new opponent to infinispan
  await Promise.all([
    upsertPlayerInCache(player),
    upsertPlayerInCache(new Player({ ...opponentData, match: match.getUUID() }))
  ]);

  // Tell the AI agent server to instantiate the opponent agent/bot
  createAiOpponentAgent(opponentData, game.getUUID());

  // Update the player with new game state information
  return {
    type: OutgoingMsgType.Configuration,
    data: new PlayerConfiguration(game, matchPlayer, match).toJSON()
  };
};

export default newMatchHandler;
