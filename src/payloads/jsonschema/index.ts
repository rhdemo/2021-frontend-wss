/* eslint-disable @typescript-eslint/no-var-requires */

import Ajv from 'ajv';
import { IncomingMsgType } from '../incoming';
import { OutgoingMsgType } from '../outgoing';
import stringify from 'fast-json-stringify';

import incoming_payload = require('./incoming.payload.json');
import incoming_connection = require('./incoming.connection.json');
import incoming_ship_positions = require('./incoming.ship-positions.json');
import incoming_attack = require('./incoming.attack.json');
import incoming_bonus = require('./incoming.bonus.json');
import incoming_new_match = require('./incoming.new-match.json');

import outgoing_heartbeat from './outgoing.heartbeat';
import outgoing_attack_result from './outgoing.attack-result';
import outgoing_bonus_result from './outgoing.bonus-result';
import outgoing_configuration from './outgoing.configuration';
import outgoing_score_update from './outgoing.score-update';

const _ajv = new Ajv({
  removeAdditional: true,
  useDefaults: true
});

export const validators = {
  validatePayload: _ajv.compile(incoming_payload),
  [IncomingMsgType.Connection]: _ajv.compile(incoming_connection),
  [IncomingMsgType.ShipPositions]: _ajv.compile(incoming_ship_positions),
  [IncomingMsgType.Attack]: _ajv.compile(incoming_attack),
  [IncomingMsgType.Bonus]: _ajv.compile(incoming_bonus),
  [IncomingMsgType.NewMatch]: _ajv.compile(incoming_new_match)
};

type FastSerialisers = {
  [key in OutgoingMsgType]: (doc: unknown) => string;
};

export const stringifiers = {
  [OutgoingMsgType.Heartbeat]: stringify(outgoing_heartbeat as any),
  [OutgoingMsgType.AttackResult]: stringify(outgoing_attack_result as any),
  [OutgoingMsgType.BonusResult]: stringify(outgoing_bonus_result as any),
  [OutgoingMsgType.Configuration]: stringify(outgoing_configuration as any),
  [OutgoingMsgType.ScoreUpdate]: stringify(outgoing_score_update as any)
} as FastSerialisers;

export const ajv = _ajv;
