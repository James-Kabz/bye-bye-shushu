declare module "pg" {
  export type QueryResult<R = Record<string, unknown>> = {
    rows: R[];
    rowCount: number;
  };

  export class Pool {
    constructor(config?: { connectionString?: string });
    query<R = Record<string, unknown>>(text: string, values?: unknown[]): Promise<QueryResult<R>>;
    end(): Promise<void>;
  }
}
