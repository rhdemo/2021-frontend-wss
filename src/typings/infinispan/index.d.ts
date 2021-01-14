declare module 'infinispan' {
  export type InfinispanNode = {
    host: string;
    port: number;
  };

  export type InfinispanClientOptions = {
    version?: '2.9' | '2.5' | '2.2';
    cacheName?: string;
    maxRetries?: number;
    ssl?: {
      enabled?: boolean;
      secureProtocol?: string;
      trustCerts?: string[];
      clientAuth?: {
        key?: string;
        passphrase?: string;
        cert?: string;
      };
      sniHostName?: string;
      cryptoStore?: {
        path?: string;
        passphrase?: string;
      };
    };
    dataFormat?: {
      keyType?: string;
      valueType?: string;
    };
    topologyUpdates?: boolean;
    // clusters: []
  };

  /**
   * A string containing a duration (number) and unit (string). Examples:
   * 1d   - 1 day
   * 2h   - 2 hours
   * 10m  - 10 minutes
   * 5s   - 5 seconds
   * 5ns  - 5 nanoseconds
   */
  export type DurationUnit = string;

  export type InifispanStat = {
    STAT_NAME: string;
    STAT_VALUE: string;
  };

  export type StoreOptions = {
    previous?: boolean;
    lifespan: DurationUnit;
    maxIdle: DurationUnit;
  };

  export type ClientEvent = 'create' | 'modify' | 'remove' | 'expiry';

  export type ListenOpts = {
    listenerId: string;
  };
  export type InfinispanIterator = {
    close(): Promise<void>;
    next(): Promise<InfinispanIteratorEntry>;
  };
  export type InfinispanIteratorEntry = {
    done: boolean;
    value: string;
  };
  export type CreateOrModifyCallback = (
    key: string,
    version: string,
    id: string
  ) => void;
  export type RemoveOrExpireCallback = (key: string, id: string) => void;

  export class InfinispanClient {
    connect(): Promise<InfinispanClient>;
    disconnect(): Promise<InfinispanClient>;

    stats(): Promise<unknown[]>;
    iter;
    get(key: string): Promise<string | undefined>;
    put(
      key: string,
      value: string,
      opts?: StoreOptions
    ): Promise<string | undefined>;
    iterator(batchSize: number): Promise<InfinispanIterator>;
    addListener(
      event: 'create' | 'modify',
      callback: CreateOrModifyCallback,
      opts?: ListenOpts
    ): Promise<string>;
    addListener(
      event: 'remove' | 'expiry',
      callback: RemoveOrExpireCallback,
      opts?: ListenOpts
    ): Promise<string>;
  }

  export function client(
    nodes: InfinispanNode | InfinispanNode[],
    options: InfinispanClientOptions
  ): InfinispanClient;
}
