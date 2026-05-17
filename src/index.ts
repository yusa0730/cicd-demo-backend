import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { pool } from "./db";

const app = new Hono();

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.get("/todos", async (c) => {
  const result = await pool.query(
    "SELECT id, title, description, created_at FROM todos ORDER BY id DESC"
  );
  return c.json(result.rows);
});

app.post("/todos", async (c) => {
  const body = await c.req.json<{ title: string; description?: string }>();
  const result = await pool.query(
    "INSERT INTO todos (title, description) VALUES ($1, $2) RETURNING id, title, description, created_at",
    [body.title, body.description ?? null]
  );
  return c.json(result.rows[0], 201);
});

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT ?? 3000),
});
