import { FastifyPluginCallback, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { recv as RecvEvents } from '@app/cloud-events';
import { ValidationError } from 'cloudevents';

import log from '@app/log';
import { UnknownCloudEventError } from '@app/cloud-events/recv';

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
        RecvEvents.processEvent(request.headers, request.body);
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

  done();
};

export default fp(eventsPlugin);
