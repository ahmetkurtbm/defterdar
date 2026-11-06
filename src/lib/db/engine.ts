import "server-only";

import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export type Row = Record<string, unknown>;

export interface Tx {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

interface Engine {
  /** Sorguları tek bir transaction içinde çalıştırır; hata olursa geri alır. */
  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
}

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

async function migrate(engine: Engine) {
  // Aynı anda açılan iki süreç aynı migration'ı iki kez uygulamasın.
  await engine.transaction(async (tx) => {
    await tx.query("select pg_advisory_xact_lock(727274)");
    await tx.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  });
  const names = readdirSync(MIGRATIONS_DIR).filter((n) => n.endsWith(".sql")).sort();
  for (const name of names) {
    await engine.transaction(async (tx) => {
      await tx.query("select pg_advisory_xact_lock(727274)");
      const done = await tx.query("select 1 from schema_migrations where name = $1", [name]);
      if (done.rows.length > 0) return;
      await tx.query(readFileSync(path.join(MIGRATIONS_DIR, name), "utf8"));
      await tx.query("insert into schema_migrations (name) values ($1)", [name]);
    });
  }
}

async function createPostgresEngine(connectionString: string): Promise<Engine> {
  const { Pool } = (await import("pg")).default;
  const pool = new Pool({ connectionString, max: 10 });

  return {
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const result = await fn({ query: (sql, params) => client.query(sql, params) as never });
        await client.query("commit");
        return result;
      } catch (error) {
        await client.query("rollback").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

/** DATABASE_URL yoksa: diske yazan gömülü Postgres. Kurulum gerektirmeden geliştirme içindir. */
async function createEmbeddedEngine(): Promise<Engine> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { pgcrypto } = await import("@electric-sql/pglite/contrib/pgcrypto");

  const dataDir = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dataDir, { recursive: true });
  const db = await PGlite.create({ dataDir, extensions: { pgcrypto } });

  return {
    transaction: (fn) =>
      db.transaction((tx) =>
        fn({
          // PGlite çok komutlu SQL'i yalnızca exec ile çalıştırır (migration dosyaları).
          query: async (sql, params) =>
            params && params.length > 0
              ? ((await tx.query(sql, params)) as never)
              : ({ rows: ((await tx.exec(sql)).at(-1)?.rows ?? []) } as never),
        }),
      ),
  };
}

const globalCache = globalThis as { __defterdarEngine?: Promise<Engine> };

async function boot(): Promise<Engine> {
  const url = process.env.DATABASE_URL;
  const engine = url ? await createPostgresEngine(url) : await createEmbeddedEngine();
  await migrate(engine);
  const { seedDemoIfEmpty } = await import("./seed");
  await seedDemoIfEmpty(engine.transaction.bind(engine));
  return engine;
}

function getEngine(): Promise<Engine> {
  if (!globalCache.__defterdarEngine) {
    const engine = boot();
    globalCache.__defterdarEngine = engine;
    engine.catch(() => {
      if (globalCache.__defterdarEngine === engine) delete globalCache.__defterdarEngine;
    });
  }
  return globalCache.__defterdarEngine;
}

/**
 * Bir ofisin verisine erişen tüm sorgular buradan geçer. Transaction süresince rol
 * `app_user`'a düşer ve RLS'in okuduğu `app.office_id` ayarlanır.
 */
export async function asOffice<T>(officeId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const engine = await getEngine();
  return engine.transaction(async (tx) => {
    await tx.query("select set_config('app.office_id', $1, true), set_config('role', 'app_user', true)", [officeId]);
    return fn(tx);
  });
}

/**
 * Kiracı bağlamı olmayan iç işler (giriş, kayıt, oturum, portal token çözümü). Rol `app_system`'e
 * düşer; bu rol yalnızca o işlerin tablolarını görür (db/migrations/0002_system_role.sql).
 */
export async function asSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const engine = await getEngine();
  return engine.transaction(async (tx) => {
    await tx.query("select set_config('role', 'app_system', true)", []);
    return fn(tx);
  });
}
