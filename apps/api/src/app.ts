import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { appRouter } from "./trpc-router.ts";

export const app = new Hono();

app.use("/trpc/*", cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));

app.use("/trpc/*", trpcServer({ router: appRouter }));

app.get("/health", (c) => c.json({ status: "ok" }));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal server error" }, 500);
});
