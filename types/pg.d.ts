declare module "pg" {
  export type QueryResult<R = Record<string, unknown>> = {
    rows: R[];
    rowCount: number;
  };

  export type PoolConfig = {
    connectionString?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    ssl?:
      | boolean
      | {
          rejectUnauthorized?: boolean;
        };
    max?: number;
    connectionTimeoutMillis?: number;
  };

  export class Pool {
    constructor(config?: PoolConfig);
    query<R = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<R>>;
    end(): Promise<void>;
  }
}
