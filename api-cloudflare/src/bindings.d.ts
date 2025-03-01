import { Env } from "hono";
import { InferSelectModel } from "drizzle-orm";
import { users } from "./db/schema";
import { initDbConnect } from "./db";

export type User = InferSelectModel<typeof users>;

export type Environment = Env & {
  Bindings: {
    DB: D1Database;
    BUCKET: R2Bucket;
    BUCKET_NAME: string;
    FILE_COUNT: KVNamespace;
    STASH_LIST: KVNamespace;
    ENV_TYPE: "dev" | "prod" | "stage";
    JWT_SECRET: string;
    ACCOUNT_ID: string;
    ACCESS_KEY: string;
    ACCESS_SECRET: string;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
  };
  Variables: {
    user: User;
    jwtPayload: {
      userId: number;
    };
    db: ReturnType<typeof initDbConnect>;
    s3: S3Client;
    fileCount: number;
  };
};
