import { FastifyPluginCallback, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { send as SendEvents, recv as RecvEvents } from '@app/cloud-events';
import { ValidationError } from 'cloudevents';
import { NODE_ENV } from '@app/config';
import { ShipType } from '@app/game/types';
import log from '@app/log';
import { DEFAULT_JOI_OPTS, ManualEventSchema } from '@app/payloads/schemas';

type PartialCloudEvent = {
  [K in keyof SendEvents.ShotEventData]?: SendEvents.ShotEventData[K];
};
type EventParams = { type: SendEvents.EventType };
type EventBody = PartialCloudEvent & { type?: string; player?: string };

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
              game: body.game,
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
              game: body.game,
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
              game: body.game
            });
            reply.send({ info: 'ok' });
            break;
          case SendEvents.EventType.Lose:
            await SendEvents.lose({
              player: body.player,
              match: body.match,
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
