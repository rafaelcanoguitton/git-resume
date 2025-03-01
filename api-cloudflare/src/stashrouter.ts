import { Context, Hono, Next } from "hono";
import type { Environment } from "./bindings";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { bucketMiddleware } from "./middleware";
import { count, eq } from "drizzle-orm";
import { stashes } from "./db/schema";

const getFileCountMiddleware = async (c: Context<Environment>, next: Next) => {
  const userId = c.get("jwtPayload").userId.toString();
  let fileCount = await c.env.FILE_COUNT.get(userId);

  if (!fileCount) {
    const result = await c
      .get("db")
      .select({ value: count() })
      .from(stashes)
      .where(eq(stashes.userId, c.get("jwtPayload").userId));

    fileCount = result[0].value.toString();
    c.set("fileCount", parseInt(fileCount));

    if (parseInt(fileCount) >= MAX_FILES_PER_USER) {
      return c.json(
        { message: "You have reached the maximum number of files" },
        400,
      );
    }

    c.executionCtx.waitUntil(
      (async () => {
        await c.env.FILE_COUNT.put(userId, fileCount).catch(console.error);
      })()
    );

    return next();
  }

  c.set("fileCount", parseInt(fileCount));
  return next();
};

const MAX_FILES_PER_USER = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB - adjust as needed
const UPLOAD_URL_EXPIRY = 300; // 5 minutes

const stashRouter = new Hono<Environment>();

stashRouter.use("*", bucketMiddleware);

stashRouter.get(
  "/getUploadUrl",
  getFileCountMiddleware,
  async (c: Context<Environment>) => {
    const { BUCKET_NAME } = c.env;
    const { filename } = await c.req.json<{ filename: string }>();
    const userId = c.get("jwtPayload").userId;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `temp/${userId}/${filename}`,
      ContentType: "application/octet-stream",
      ContentLength: MAX_FILE_SIZE,
      Metadata: {
        "original-filename": filename,
        "user-id": userId.toString(),
      },
    });

    const url = await getSignedUrl(c.get("s3"), command, {
      expiresIn: UPLOAD_URL_EXPIRY,
    });

    return c.json({ url });
  },
);

stashRouter.post(
  "/create",
  getFileCountMiddleware,
  async (c: Context<Environment>) => {
    const userId = c.get("jwtPayload").userId;
    const { BUCKET_NAME } = c.env;
    const { filename } = await c.req.json<{
      filename: string;
    }>();
    const tempFilename = `temp/${userId}/${filename}`;
    const newFilename = `stashes/${userId}/${filename}`;

    await c.get("s3").send(
      new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: tempFilename,
      }),
    );

    await c.get("s3").copyObject({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${tempFilename}`,
      Key: newFilename,
    });
    await c.get("s3").deleteObject({
      Bucket: BUCKET_NAME,
      Key: tempFilename,
    });

    await c.get("db").insert(stashes).values({
      userId,
      path: newFilename,
    });

    c.executionCtx.waitUntil(
      (async () => {
        const updatedStashes = await c.get("db").query.stashes.findMany({
          where: eq(stashes.userId, userId),
        });
        await c.env.STASH_LIST.put(
          userId.toString(),
          JSON.stringify(updatedStashes)
        );
      })()
    );

    return c.json({ message: "File created" });
  },
);

stashRouter.get("/list", async (c: Context<Environment>) => {
  const stashList = await c.env.STASH_LIST.get(
    c.get("jwtPayload").userId.toString(),
  );

  if (stashList) {
    return c.json({ stashes: JSON.parse(stashList) });
  }

  const stashfromDB = await c.get("db").query.stashes.findMany({
    where: eq(stashes.userId, c.get("jwtPayload").userId),
  });

  c.executionCtx.waitUntil(
    (async () => {
      await c.env.STASH_LIST.put(
        c.get("jwtPayload").userId.toString(),
        JSON.stringify(stashfromDB)
      );
    })()
  );

  return c.json({ stashes: stashfromDB });
});

export default stashRouter;
