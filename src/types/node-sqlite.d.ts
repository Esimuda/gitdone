declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }

  export class StatementSync {
    run(...params: (string | number | null | bigint)[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: (string | number | null)[]): Record<string, unknown> | undefined;
    all(...params: (string | number | null)[]): Record<string, unknown>[];
  }
}
