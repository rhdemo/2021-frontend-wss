'use strict';

import { CloudEventBase, EventType } from '@app/cloud-events/types';
import log from '@app/log';
import { Kafka, KafkaConfig, Producer } from 'kafkajs';
import {
  KAFKA_BOOTSTRAP_URL,
  KAFKA_SVC_USERNAME,
  KAFKA_SVC_PASSWORD,
  KAFKA_TOPIC_MATCHES,
  CLUSTER_NAME as cluster
} from '@app/config';

let kafka!: Kafka;
let kafkaOpts!: KafkaConfig;
let producer!: Producer;
if (!KAFKA_BOOTSTRAP_URL || !KAFKA_SVC_USERNAME || !KAFKA_SVC_PASSWORD) {
  log.warn(
    'Kafka senders set to no-op. Set KAFKA_BOOTSTRAP_URL, KAFKA_SVC_USERNAME, KAFKA_SVC_PASSWORD to send data to Kafka'
  );
} else {
  kafkaOpts = {
    clientId: 'knative-match-event-forwarder',
    brokers: [KAFKA_BOOTSTRAP_URL],
    connectionTimeout: 15000,
    sasl: {
      mechanism: 'scram-sha-512',
      username: KAFKA_SVC_USERNAME,
      password: KAFKA_SVC_PASSWORD
    },
    ssl: {
      rejectUnauthorized: false
    }
  };
  kafka = new Kafka(kafkaOpts);
  producer = kafka.producer();

  producer.on(producer.events.CONNECT, () => {
    log.info(`Kafka producer connected to broker ${KAFKA_BOOTSTRAP_URL}`);
  });

  producer.on(producer.events.DISCONNECT, (e) => {
    log.error(`Kafka producer disconnected from broker ${KAFKA_BOOTSTRAP_URL}`);
    log.error(e);
    process.exit(1);
  });

  producer.on(producer.events.REQUEST_TIMEOUT, (e) => {
    log.error('Kafka producer had a request timeout');
    log.error(e);
  });

  producer.connect();
}

const eventTypeMap: { [k in EventType]: string } = {
  [EventType.MatchStart]: 'start',
  [EventType.Attack]: 'attack',
  [EventType.Bonus]: 'bonus',
  [EventType.MatchEnd]: 'end'
};

export function send(type: EventType, data: CloudEventBase) {
  if (kafka && type !== EventType.Bonus) {
    const ts  = Date.now()
    const message = {
      key: `${data.game}:${data.match}`,
      value: JSON.stringify({ type: eventTypeMap[type], ts, data, cluster })
    };

    log.debug(
      `sending match update of type ${type} for key ${message.key} to topic ${KAFKA_TOPIC_MATCHES}`
    );
    log.trace(`sending payload to kafka: %j`, message);

    return producer
      .send({
        topic: KAFKA_TOPIC_MATCHES,
        messages: [message]
      })
      .catch((e) => {
        log.error('error sending to kafka');
        log.error(e);
      });
  }
}
