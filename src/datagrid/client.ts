import { InfinispanClient, ClientEvent, InfinispanNode } from 'infinispan';
import { DATAGRID_HOST, DATAGRID_HOTROD_PORT } from '@app/config';
import infinispan from 'infinispan';
import log from '@app/log';

export type DataGridEventHandle = (
  client: InfinispanClient,
  event: ClientEvent,
  key: string
) => void;

async function getClient(
  nodes: InfinispanNode[],
  cacheName: string
): Promise<InfinispanClient> {
  const client = await infinispan.client(nodes, {
    cacheName,
    // dataFormat: {
    //   keyType: 'text/plain',
    //   valueType: 'application/json',
    // }
  });
  log.info(`connected to infinispan for "${cacheName}" cache`);

  const stats = await client.stats();
  log.info(`stats for "${cacheName}":\n`, JSON.stringify(stats, null, 2));

  return client;
}

export default async function getDataGridClientForCacheNamed(
  cacheName: string,
  eventHandler?: DataGridEventHandle
): Promise<InfinispanClient> {
  log.info(`creating infinispan client for cache named "${cacheName}"`);

  const nodes = [
    {
      host: DATAGRID_HOST,
      port: DATAGRID_HOTROD_PORT
    }
  ];

  const client = await getClient(nodes, cacheName);

  if (eventHandler) {
    const listenerId = await client.addListener('create', (key) =>
      eventHandler(client, 'create', key)
    );

    await client.addListener(
      'modify',
      (key) => eventHandler(client, 'modify', key),
      { listenerId }
    );
  }

  return client;
}
