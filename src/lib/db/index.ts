import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env, isDemoMode } from "@/lib/env";
import * as schema from "@/lib/db/schema";

declare global {
  var __rocketMarketSql: ReturnType<typeof postgres> | undefined;
}

export function getDb() {
  if (isDemoMode()) {
    return null;
  }

  const sql =
    globalThis.__rocketMarketSql ??
    postgres(env.databaseUrl, {
      max: 1,
      prepare: false,
    });

  globalThis.__rocketMarketSql = sql;
  return drizzle(sql, { schema });
}
