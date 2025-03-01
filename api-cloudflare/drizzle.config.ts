import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const isProd = process.env.NODE_ENV === "production";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  ...(isProd && {
    driver: "d1-http",
  }),
  dbCredentials: isProd
    ? {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
        databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
        token: process.env.CLOUDFLARE_D1_TOKEN!,
      }
    : {
        url: "./.wrangler/state/v3/d1/miniflare-D1DatabaseObject/37aca6877f23b1bf06262bca3b55e80fa610ea8baa1e274af0664f6074ab4d66.sqlite",
      },
});
