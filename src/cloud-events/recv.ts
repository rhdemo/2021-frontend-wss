import log from '@app/log';
import { CloudEvent, HTTP } from 'cloudevents';
import { FastifyRequest } from 'fastify';

enum EventType {
  HitProcessed = 'hitprocessed',
  MissProcessed = 'missprocessed',
  SinkProcessed = 'sinkprocessed',
  WinProcessed = 'winprocessed',
  LoseProcessed = 'loseprocessed',
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
    body,
    headers
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
  return evt.type in ValidEvents;
}

/**
 * Processes events emitted
 * @param headers
 * @param body
 */
export function processEvent(evt: CloudEvent) {
  switch (evt.type) {
    case EventType.HitProcessed:
      log.info(`received "${evt.type}" event`);
      break;
    case EventType.MissProcessed:
      log.info(`received "${evt.type}" event`);
      break;
    case EventType.SinkProcessed:
      log.info(`received "${evt.type}" event`);
      break;
    case EventType.BonusProcessed:
      log.info(`received "${evt.type}" event`);
      break;
    case EventType.WinProcessed:
      log.info(`received "${evt.type}" event`);
      break;
    case EventType.LoseProcessed:
      log.info(`received "${evt.type}" event`);
      break;
    default:
      throw new Error(`Unknown Cloud Event type: "${evt.type}"`);
      break;
  }
}
