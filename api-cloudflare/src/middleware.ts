import { jwt } from "hono/jwt";
import { eq } from "drizzle-orm";
import { users } from "./db/schema";
import type { Context, Next } from "hono";
import type { Environment } from "./bindings";
import { S3Client } from "@aws-sdk/client-s3";

// const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
// const accessKey = process.env.CLOUDFLARE_ACCESS_KEY!;
// const accessSecret = process.env.CLOUDFLARE_ACCESS_SECRET!;

export const authMiddleware = async (c: Context<Environment>, next: Next) => {
  try {
    const jwtMiddleware = jwt({
      secret: c.env.JWT_SECRET,
    });
    await jwtMiddleware(c, next);

    const payload = c.get("jwtPayload");

    const user = await c.get("db").query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      return c.json({ message: "User not found" }, 401);
    }

    c.set("user", user);

    await next();
  } catch (e: any) {
    if (e.message.includes("JWT")) {
      return c.json({ message: "Invalid token" }, 401);
    }
    return c.json({ message: "Authentication failed" }, 401);
  }
};

export const bucketMiddleware = async (c: Context<Environment>, next: Next) => {
  const S3 = new S3Client({
    region: "auto",
    // endpoint: `https://${c.env.ACCOUNT_ID}.r2.cloudflarestorage.com`,
    endpoint: "http://127.0.0.1:8787",
    credentials: {
      accessKeyId: c.env.ACCESS_KEY,
      secretAccessKey: c.env.ACCESS_SECRET,
    },
  });

  c.set("s3", S3);
  await next();
};
