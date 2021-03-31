import log from '@app/log';
import { CloudEvent, HTTP } from 'cloudevents';
import { FastifyRequest } from 'fastify';

enum EventType {
  AttackProcessed = 'attackprocessed',
  BonusProcessed = 'bonusprocessed'
}

const ValidEvents = Object.values(EventType);

/**
 * Parses incoming HTTP headers and body to a Cloud Event and returns the
 * CloudEvent instance.
 *
 * Can throw an error if the request is not correctly formatted.
 *
 * @param headers
 * @param body
 */
export function parse(
  headers: FastifyRequest['headers'],
  body: FastifyRequest['body']
): CloudEvent {
  log.trace('parsing cloud event. data: %j', {
    headers,
    body
  });

  return HTTP.toEvent({
    headers,
    body
  });
}

/**
 * Determines if a given Cloud Event has a known "type" field.
 * @param evt
 */
export function isKnownEventType(evt: CloudEvent): boolean {
  log.trace(`checking if "${evt.type}" is in known types: %j`, ValidEvents);
  return evt.type in ValidEvents;
}

/**
 * Processes events emitted
 * @param headers
 * @param body
 */
export function processEvent(evt: CloudEvent) {
  switch (evt.type) {
    case EventType.AttackProcessed:
      log.trace(`received "${evt.type}" event: %j`, evt.data);
      break;
    case EventType.BonusProcessed:
      log.trace(`received "${evt.type}" event: %j`, evt.data);
      break;
    default:
      throw new Error(`Unknown Cloud Event type: "${evt.type}"`);
  }
}
