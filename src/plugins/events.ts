import { FastifyPluginCallback, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import * as CE from '@app/cloud-events';
import { NODE_ENV } from '@app/config';
import { ShipType } from '@app/game/types';
import log from '@app/log';
import { ManualEventSchema } from '@app/payloads/schemas';

type PartialCloudEvent = {
  [K in keyof CE.CloudEventBase]?: CE.CloudEventBase[K];
};
type EventParams = { type: CE.CloudEventType };
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
      log.trace('received cloud event. body was: %j', request.body);
      reply.send('ok');
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

        const result = ManualEventSchema.validate(req.body || {});

        if (result.error) {
          return reply.status(400).send(result.error);
        }

        const body = result.value as CE.CloudEventBase & {
          type: string;
          player: string;
        };

        switch (type) {
          case CE.CloudEventType.Hit:
            await CE.hit({
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
          case CE.CloudEventType.Miss:
            await CE.miss({
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
          case CE.CloudEventType.Sink:
            await CE.sink({
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
          case CE.CloudEventType.Win:
            await CE.win({
              player: body.player,
              match: body.match,
              game: body.game
            });
            reply.send({ info: 'ok' });
            break;
          case CE.CloudEventType.Lose:
            await CE.lose({
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
