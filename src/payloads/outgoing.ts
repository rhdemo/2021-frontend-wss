export enum OutgoingMsgType {
  AttackResult = 'attack-result',
  BonusResult = 'bonus-result',
  BadAttack = 'bad-attack',
  ServerError = 'server-error',
  BadMessageType = 'bad-message-type',
  BadPayload = 'invalid-payload',
  Heartbeat = 'heartbeat',
  Configuration = 'configuration',
  BoardState = 'board-state',
  PleaseWait = 'please-wait',
  GameState = 'game-state',
  ScoreUpdate = 'score-update'
}

export type ValidationErrorPayload = {
  info: string;
};
