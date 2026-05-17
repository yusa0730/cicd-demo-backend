import { pool } from "./db";

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id         SERIAL PRIMARY KEY,
      title      TEXT        NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    ALTER TABLE todos
    ADD COLUMN IF NOT EXISTS description TEXT
  `);

  console.log("migration completed");
}

main()
  .catch((err) => {
    console.error("migration failed", err);
    process.exit(1);
  })
  .finally(() => pool.end());
