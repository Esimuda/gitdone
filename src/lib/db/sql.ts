import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "./migrate";

export type Row = Record<string, unknown>;

export interface Sql {
  dialect: "sqlite" | "postgres";
  exec(statement: string): Promise<void>;
  get(sql: string, params?: unknown[]): Promise<Row | undefined>;
  all(sql: string, params?: unknown[]): Promise<Row[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
  close(): Promise<void>;
}

let singleton: Promise<Sql> | null = null;

export function databaseFile(): string {
  const dir = process.env.GITDONE_DATA_DIR?.trim() || path.join(process.cwd(), ".data");
  return path.join(dir, "gitdone.sqlite");
}

export async function getSql(): Promise<Sql> {
  if (!singleton) singleton = openSql();
  return singleton;
}

export async function resetSqlForTests(): Promise<void> {
  const current = singleton;
  singleton = null;
  if (current) await (await current).close();
}

export async function openMemorySql(): Promise<Sql> {
  const sql = sqliteSql(new DatabaseSync(":memory:"));
  await migrate(sql);
  return sql;
}

async function openSql(): Promise<Sql> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    const { Pool } = await import("pg");
    const local = /localhost|127\.0\.0\.1/.test(databaseUrl);
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: local ? undefined : { rejectUnauthorized: false },
      max: 5,
    });
    const sql = postgresSql(pool);
    await migrate(sql);
    return sql;
  }
  const file = databaseFile();
  mkdirSync(path.dirname(file), { recursive: true });
  const sql = sqliteSql(new DatabaseSync(file));
  await migrate(sql);
  return sql;
}

export function sqliteSql(db: DatabaseSync): Sql {
  return {
    dialect: "sqlite",
    async exec(statement: string) {
      db.exec(statement);
    },
    async get(sql: string, params: unknown[] = []) {
      return db.prepare(sql).get(...(params as (string | number | null | bigint)[])) as Row | undefined;
    },
    async all(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...(params as (string | number | null | bigint)[])) as Row[];
    },
    async run(sql: string, params: unknown[] = []) {
      db.prepare(sql).run(...(params as (string | number | null | bigint)[]));
    },
    async close() {
      db.close();
    },
  };
}

function postgresSql(pool: import("pg").Pool): Sql {
  return {
    dialect: "postgres",
    async exec(statement: string) {
      await pool.query(statement);
    },
    async get(sql: string, params: unknown[] = []) {
      const result = await pool.query(toPostgres(sql), params);
      return result.rows[0] as Row | undefined;
    },
    async all(sql: string, params: unknown[] = []) {
      const result = await pool.query(toPostgres(sql), params);
      return result.rows as Row[];
    },
    async run(sql: string, params: unknown[] = []) {
      await pool.query(toPostgres(sql), params);
    },
    async close() {
      await pool.end();
    },
  };
}

export function toPostgres(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}
