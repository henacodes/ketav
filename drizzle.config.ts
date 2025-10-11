import { defineConfig } from "drizzle-kit";

// this config has no relevance as the database resides inside app data where the drizzle-kit cant access it and that migrations are applied by lib.rs
export default defineConfig({
  out: "./src-tauri/migrations",
  schema: "./src/db/schema/index.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: `sqlite:ketav.db`,
  },
});
