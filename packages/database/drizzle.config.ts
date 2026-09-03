import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile("../../.env");
} catch {
  // no .env yet — fall back to the docker-compose defaults below
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://home-bird:home-bird@localhost:5434/home-bird",
  },
});
