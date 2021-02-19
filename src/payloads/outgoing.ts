export enum OutgoingMsgType {
  AttackResult = 'attack-result',
  BadAttack = 'bad-attack',
  ServerError = 'server-error',
  BadMessageType = 'bad-message-type',
  BadPayload = 'invalid-payload',
  Heartbeat = 'heartbeat',
  Configuration = 'configuration',
  BoardState = 'board-state'
}

export type ValidationErrorPayload = {
  info: string;
};
