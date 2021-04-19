import { FastifyPluginCallback, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { send as SendEvents, recv as RecvEvents } from '@app/cloud-events';
import { ValidationError } from 'cloudevents';
import { NODE_ENV } from '@app/config';
import { ShipType } from '@app/game/types';
import log from '@app/log';
import GameConfiguration, { GameState } from '@app/models/game.configuration';
import MatchInstance from '@app/models/match.instance';
import { nanoid } from 'nanoid';
import generateUserName from '@app/stores/players/username.generator';
import Joi from 'joi';
import { AttackResult } from '@app/payloads/common';
import MatchPlayer from '@app/models/match.player';
import { UnknownCloudEventError } from '@app/cloud-events/recv';

type NewEventParams = { type: SendEvents.EventType };
type NewEventBody = {
  game: { uuid: string };
  match: {
    uuid: string;
    playerA: string;
    playerB: string;
  };
  attack: AttackResult;
};

const eventsPlugin: FastifyPluginCallback = (server, options, done) => {
  /**
   * This endpoint is used to process received cloud events.
   * These events are forwarded to this service using a Knative Trigger.
   */
  server.route({
    method: 'POST',
    url: '/event/trigger',
    handler: (request, reply) => {
      reply.status(202).send();

      try {
        RecvEvents.processEvent(request.headers, request.body)
      } catch (e) {
        if (e instanceof ValidationError) {
          log.warn('error parsing cloud event. event data: %j', {
            body: request.body,
            headers: request.headers
          });
          log.warn(e);
        } else if (e instanceof UnknownCloudEventError) {
          log.error('received unknown cloud event type');
          log.error(e);
        } else {
          log.error('error processing cloud event');
          log.error(e);
        }
      }
    }
  });

  if (NODE_ENV === 'dev') {
    const GameSchema = Joi.object({
      uuid: Joi.string()
    }).default(() => {
      return { uuid: nanoid() };
    });
    const MatchSchema = Joi.object({
      uuid: Joi.string().default(() => nanoid()),
      playerA: Joi.string().default(() => nanoid()),
      playerB: Joi.string().default(() => nanoid())
    }).default(() => {
      return {
        uuid: nanoid(),
        playerA: nanoid(),
        playerB: nanoid()
      };
    });
    const AttackSchema = Joi.object({
      destroyed: Joi.boolean(),
      hit: Joi.boolean(),
      origin: Joi.array().length(2).items(Joi.number().integer().max(4).min(0)),
      type: Joi.string().valid(
        ShipType.Carrier,
        ShipType.Battleship,
        ShipType.Destroyer,
        ShipType.Submarine
      )
    }).default(() => {
      return {
        destroyed: false,
        hit: true,
        origin: [0, 0],
        type: ShipType.Destroyer
      };
    });

    const NewBody = Joi.object({
      game: GameSchema,
      match: MatchSchema,
      attack: AttackSchema
    });

    server.route({
      method: 'POST',
      url: '/event/send/:type',
      handler: async (
        request: FastifyRequest<{ Params: NewEventParams }>,
        reply
      ) => {
        const { params } = request;

        const validation = NewBody.validate(request.body || {}, {
          stripUnknown: true,
          abortEarly: false
        });

        if (validation.error) {
          return reply.status(400).send(validation.error);
        }

        const body = validation.value as NewEventBody;

        log.info(
          `received request to manually send "${params.type}" cloud event with body: %j`,
          body
        );

        const game = new GameConfiguration(
          body.game.uuid,
          new Date().toISOString(),
          GameState.Active
        );
        const player = new MatchPlayer({
          match: body.match.uuid,
          uuid: body.match.playerA,
          isAi: false,
          username: generateUserName()
        });
        const opponent = new MatchPlayer({
          match: body.match.uuid,
          uuid: body.match.playerB,
          isAi: false,
          username: generateUserName()
        });
        const match = new MatchInstance(player, opponent);

        if (params.type === SendEvents.EventType.Attack) {
          await SendEvents.attack(game, match, player, opponent, body.attack);
          return `queued "${params.type}" cloud event`;
        } else if (params.type === SendEvents.EventType.MatchStart) {
          await SendEvents.matchStart(game, match, player, opponent);
          return `queued "${params.type}" cloud event`;
        } else if (params.type === SendEvents.EventType.MatchEnd) {
          await SendEvents.matchEnd(game, match, player, opponent);
          return `queued "${params.type}" cloud event`;
        } else {
          return reply.send(`unknown event type: "${params.type}"`);
        }
      }
    });
  }

  done();
};

export default fp(eventsPlugin);
