declare module 'sql.js' {
  export interface QueryExecResult {
    columns: string[]
    values: unknown[][]
  }

  export class Statement {
    bind(values?: unknown[] | Record<string, unknown>): boolean
    step(): boolean
    get(params?: Record<string, unknown>): unknown[]
    getAsObject(params?: Record<string, unknown>): Record<string, unknown>
    run(values?: unknown[] | Record<string, unknown>): void
    free(): boolean
  }

  export class Database {
    constructor(data?: Uint8Array | ArrayLike<number>)
    run(sql: string, params?: unknown[] | Record<string, unknown>): Database
    exec(sql: string): QueryExecResult[]
    prepare(sql: string, params?: unknown[] | Record<string, unknown>): Statement
    export(): Uint8Array
    close(): void
  }

  export interface SqlJsStatic {
    Database: typeof Database
  }

  export default function initSqlJs(config?: unknown): Promise<SqlJsStatic>
}
