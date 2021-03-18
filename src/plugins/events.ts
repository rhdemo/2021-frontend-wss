import { FastifyPluginCallback, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { send as SendEvents, recv as RecvEvents } from '@app/cloud-events';
import * as NewCE from '@app/cloud-events/send.new';
import { ValidationError } from 'cloudevents';
import { NODE_ENV } from '@app/config';
import { ShipType } from '@app/game/types';
import log from '@app/log';
import { DEFAULT_JOI_OPTS, ManualEventSchema } from '@app/payloads/schemas';
import GameConfiguration, { GameState } from '@app/models/game.configuration';
import MatchInstance from '@app/models/match.instance';
import Player from '@app/models/player';
import { nanoid } from 'nanoid';
import generateUserName from '@app/stores/players/username.generator';
import Joi, { valid } from 'joi';
import { AttackResult } from '@app/payloads/common';

type PartialCloudEvent = {
  [K in keyof SendEvents.ShotEventData]?: SendEvents.ShotEventData[K];
};
type EventParams = { type: SendEvents.EventType };
type EventBody = PartialCloudEvent & { type?: string; player?: string };

type NewEventParams = { type: NewCE.EventType };
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
      try {
        const evt = RecvEvents.parse(request.headers, request.body);

        if (RecvEvents.isKnownEventType(evt)) {
          reply.status(422).send({
            info: `Cloud Event type "${evt.type}" is not known`
          });
        } else {
          RecvEvents.processEvent(evt);
        }
      } catch (e) {
        if (e instanceof ValidationError) {
          log.warn('error parsing cloud event. event data: %j', {
            body: request.body,
            headers: request.headers
          });
          log.warn(e);

          reply.status(400).send({
            info: 'Cloud Event validation failed',
            details: e.errors
          });
        } else {
          reply.status(500).send('internal server error');
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

        const validation = NewBody.validate(
          request.body || {},
          DEFAULT_JOI_OPTS
        );

        if (validation.error) {
          return reply.status(400).send(validation.error);
        }

        const body = validation.value as NewEventBody;
        console.log('validated data', body);

        log.info(
          `received request to manually send "${params.type}" cloud event with body: %j`,
          body
        );

        const game = new GameConfiguration(
          body.game.uuid,
          new Date().toISOString(),
          GameState.Active
        );
        const match = new MatchInstance(
          body.match.playerA,
          body.match.playerB,
          undefined,
          undefined,
          body.match?.uuid
        );
        const player = new Player({
          uuid: match.getPlayers().playerA,
          username: generateUserName(),
          isAi: false
        });
        player.setShipPositionData(player.getShipPositionData(), true);
        const opponent = new Player({
          uuid: match.getPlayers().playerB,
          username: generateUserName(),
          isAi: true
        });
        opponent.setShipPositionData(opponent.getShipPositionData(), true);

        if (params.type === NewCE.EventType.Attack) {
          await NewCE.attack(game, match, player, opponent, body.attack);
          return `queued "${params.type}" cloud event`;
        } else if (params.type === NewCE.EventType.MatchStart) {
          await NewCE.matchStart(game, match, player, opponent);
          return `queued "${params.type}" cloud event`;
        } else if (params.type === NewCE.EventType.MatchEnd) {
          await NewCE.matchEnd(game, match, player, opponent);
          return `queued "${params.type}" cloud event`;
        } else {
          return reply.send(`unknown event type: "${params.type}"`);
        }
      }
    });
  }

  if (NODE_ENV === 'dev') {
    log.info(
      `mounting cloud event debug endpoint /event/:type since NODE_ENV=${NODE_ENV}`
    );

    server.route({
      method: 'POST',
      url: '/event/:type',
      handler: async (
        req: FastifyRequest<{ Params: EventParams; Body: EventBody }>,
        reply
      ) => {
        const { type } = req.params;

        log.info(
          `received request to manually send "${type}" cloud event with body: %j`,
          req.body
        );

        const result = ManualEventSchema.validate(
          req.body || {},
          DEFAULT_JOI_OPTS
        );

        if (result.error) {
          return reply.status(400).send(result.error);
        }

        const body = result.value as SendEvents.ShotEventData & {
          type: string;
          player: string;
        };

        switch (type) {
          case SendEvents.EventType.Hit:
            await SendEvents.hit({
              by: body.by,
              against: body.against,
              match: body.match,
              human: true,
              game: body.game,
              consecutiveHitsCount: body.consecutiveHitsCount,
              shotCount: body.shotCount,
              ts: body.ts || Date.now(),
              // This line causes a funky compiler error without the cast and as const...
              origin: (body.origin as any) || (`${0},${0}` as const),
              type: (body.type as ShipType) || ShipType.Carrier
            });
            reply.send({ info: 'ok' });
            break;
          case SendEvents.EventType.Miss:
            await SendEvents.miss({
              by: body.by,
              against: body.against,
              match: body.match,
              human: true,
              consecutiveHitsCount: body.consecutiveHitsCount,
              shotCount: body.shotCount,
              game: body.game,
              ts: body.ts || Date.now(),
              // This line causes a funky compiler error without the cast and as const...
              origin: (body.origin as any) || (`${0},${0}` as const)
            });
            reply.send({ info: 'ok' });
            break;
          case SendEvents.EventType.Sink:
            await SendEvents.sink({
              by: body.by,
              against: body.against,
              match: body.match,
              human: true,
              game: body.game,
              consecutiveHitsCount: body.consecutiveHitsCount,
              shotCount: body.shotCount,
              ts: body.ts || Date.now(),
              // This line causes a funky compiler error without the cast and as const...
              origin: (body.origin as any) || (`${0},${0}` as const),
              type: (body.type as ShipType) || ShipType.Carrier
            });
            reply.send({ info: 'ok' });
            break;
          case SendEvents.EventType.Win:
            await SendEvents.win({
              player: body.player,
              match: body.match,
              shotCount: body.shotCount,
              human: true,
              game: body.game
            });
            reply.send({ info: 'ok' });
            break;
          case SendEvents.EventType.Lose:
            await SendEvents.lose({
              player: body.player,
              match: body.match,
              shotCount: body.shotCount,
              human: true,
              game: body.game
            });
            reply.send({ info: 'ok' });
            break;
          default:
            reply.status(400).send({
              info: `Event type "${type}" not recognised`
            });
            break;
        }
      }
    });
  } else {
    log.info(
      `not mounting cloud event debug endpoint /event/:type since NODE_ENV=${NODE_ENV}`
    );
  }

  done();
};

export default fp(eventsPlugin);
