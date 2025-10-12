import { defineConfig } from "drizzle-kit";


// the sqlite file resides in the tauri app data directory
// i had no choice but to hardcode it for now

export default defineConfig({
  out: "./src-tauri/migrations",
  schema: "./src/db/schema/index.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: `file:/home/kirakos/.config/com.kirakos.ketav/ketav-local.db`,
  },
});
