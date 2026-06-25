import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

// Using Kysely — lightweight query builder, no magic, works well with TypeScript
// Alternative: Drizzle ORM if you prefer a more Rails-like feel

interface Database {
  removal_requests: {
    id: string;
    user_id: string;
    broker_id: string;
    status: "queued" | "submitted" | "confirmed" | "failed";
    workflow_id: string;
    submitted_at: Date | null;
    next_resubmit_at: Date | null;
    poa_signature_id: string;
    created_at: Date;
  };
}

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false } // Railway's internal TLS
          : false,
      max: 10, // connection pool size
    }),
  }),
});
