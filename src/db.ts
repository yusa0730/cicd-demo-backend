import { readFileSync } from "node:fs";
import { Pool } from "pg";

const sslRootCert = process.env.PGSSLROOTCERT;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslRootCert
    ? {
        ca: readFileSync(sslRootCert, "utf8"),
        rejectUnauthorized: true,
      }
    : undefined,
});
