import { readdirSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";

const migrationsDir = fileURLToPath(new URL("../../../packages/database/drizzle", import.meta.url));

const applyMigrations = async (connectionString: string) => {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const migrations = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .toSorted();
    for (const migration of migrations) {
      // oxlint-disable-next-line no-await-in-loop -- migrations must run in order
      await client.query(readFileSync(join(migrationsDir, migration, "migration.sql"), "utf8"));
    }
  } finally {
    await client.end();
  }
};

let container: StartedPostgreSqlContainer;
let imageStorageDir: string;

export const setup = async () => {
  container = await new PostgreSqlContainer("postgres:18-alpine").start();
  const url = container.getConnectionUri();
  await applyMigrations(url);
  // Read by Config.string("DATABASE_URL") when the app runtime builds its layers.
  process.env.DATABASE_URL = url;

  // Keep uploaded images inside a throwaway directory instead of the repo.
  imageStorageDir = await mkdtemp(join(tmpdir(), "home-bird-images-"));
  process.env.IMAGE_STORAGE_DIR = imageStorageDir;
};

export const teardown = async () => {
  await container?.stop();
  if (imageStorageDir) {
    await rm(imageStorageDir, { recursive: true, force: true });
  }
};
