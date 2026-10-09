import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Pool } from "pg";

/**
 * A single JSON document with serialized read-modify-write updates.
 *
 * The file backend serves local development and tests. When DATABASE_URL is
 * set, the Postgres backend keeps the same document in one row, so writes
 * stay atomic across serverless instances.
 */
export type DocumentStore = {
  /** The stored value, or undefined when nothing has been stored yet. */
  read(): Promise<unknown>;
  /** Runs `change` while no other writer can update the same document. */
  update<T>(
    change: (
      current: unknown,
    ) => Promise<{ next: unknown; result: T }> | { next: unknown; result: T },
  ): Promise<T>;
};

type DocumentStoreOptions = {
  /** Row key in Postgres. */
  key: string;
  /** Used in error messages, for example "events". */
  label: string;
  /** File used by the file backend, and the first-run seed for Postgres. */
  filePath: string;
  /** True when the operator chose the file path, so a missing file is an error. */
  fileConfigured: boolean;
  /** Bundled file whose contents seed an empty database. */
  seedFilePath: string;
};

type Change<T> = (
  current: unknown,
) => Promise<{ next: unknown; result: T }> | { next: unknown; result: T };

function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL?.trim() || undefined;
}

async function readJsonFile(
  filePath: string,
  label: string,
): Promise<unknown | undefined> {
  let source: string;
  try {
    source = await fs.readFile(/*turbopackIgnore: true*/ filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }

  try {
    return JSON.parse(source) as unknown;
  } catch {
    throw new Error(`Unable to parse ${label} file at ${filePath}`);
  }
}

function createFileStore(options: DocumentStoreOptions): DocumentStore {
  const { filePath, fileConfigured, label } = options;

  async function read(): Promise<unknown> {
    const value = await readJsonFile(filePath, label);
    if (value === undefined && fileConfigured) {
      throw new Error(`The configured ${label} file is missing.`);
    }
    return value;
  }

  async function write(value: unknown): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const temporaryFile = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
    await fs.writeFile(temporaryFile, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await fs.rename(temporaryFile, filePath);
  }

  let queue: Promise<void> = Promise.resolve();

  return {
    read,
    update<T>(change: Change<T>): Promise<T> {
      const operation = queue.then(async () => {
        const outcome = await change(await read());
        await write(outcome.next);
        return outcome.result;
      });
      queue = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    },
  };
}

const TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS site_documents (
    key text PRIMARY KEY,
    data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )
`;

type PoolState = { pool: Pool; ready: Promise<void> };

const globalForPool = globalThis as typeof globalThis & {
  __ccsDocumentPools?: Map<string, PoolState>;
};

function poolFor(connectionString: string): PoolState {
  // Survive dev-server module reloads and share one pool per database.
  const pools = (globalForPool.__ccsDocumentPools ??= new Map());
  let state = pools.get(connectionString);
  if (!state) {
    const pool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    // An idle client dropping must not crash the server.
    pool.on("error", () => undefined);
    const ready = pool.query(TABLE_SQL).then(
      () => undefined,
      (error: unknown) => {
        // Retry on the next request instead of caching the failure.
        pools.delete(connectionString);
        void pool.end();
        throw error;
      },
    );
    state = { pool, ready };
    pools.set(connectionString, state);
  }
  return state;
}

function createPostgresStore(
  connectionString: string,
  options: DocumentStoreOptions,
): DocumentStore {
  const { key, label, seedFilePath } = options;

  // An empty database starts from the bundled file, so a first deploy shows
  // the existing content. Once a row exists the file is never consulted again.
  function seed(): Promise<unknown | undefined> {
    return readJsonFile(seedFilePath, label);
  }

  return {
    async read(): Promise<unknown> {
      const { pool, ready } = poolFor(connectionString);
      await ready;
      const { rows } = await pool.query<{ data: unknown }>(
        "SELECT data FROM site_documents WHERE key = $1",
        [key],
      );
      return rows.length > 0 ? rows[0].data : seed();
    },

    async update<T>(change: Change<T>): Promise<T> {
      const { pool, ready } = poolFor(connectionString);
      await ready;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // The advisory lock also covers the first insert, when there is no
        // row to lock yet, and is released automatically at COMMIT/ROLLBACK.
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          `site_documents:${key}`,
        ]);
        const { rows } = await client.query<{ data: unknown }>(
          "SELECT data FROM site_documents WHERE key = $1",
          [key],
        );
        const current = rows.length > 0 ? rows[0].data : await seed();
        const outcome = await change(current);
        await client.query(
          `INSERT INTO site_documents (key, data) VALUES ($1, $2::jsonb)
           ON CONFLICT (key) DO UPDATE
             SET data = EXCLUDED.data, updated_at = now()`,
          [key, JSON.stringify(outcome.next)],
        );
        await client.query("COMMIT");
        return outcome.result;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export function createDocumentStore(
  options: DocumentStoreOptions,
): DocumentStore {
  const connectionString = databaseUrl();
  return connectionString
    ? createPostgresStore(connectionString, options)
    : createFileStore(options);
}
