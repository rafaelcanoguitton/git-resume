import express from "express";
require("dotenv").config();
import { z } from "zod";
import * as trpcExpress from "@trpc/server/adapters/express";
import { inferAsyncReturnType, initTRPC, TRPCError } from "@trpc/server";
import passport from "passport";
import GitHubStrategy from "passport-github";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

// TRPC Context

// No context yet
const createContext = async ({
  req,
}: trpcExpress.CreateExpressContextOptions) => {
  // Create your context based on the request object
  // Will be available as `ctx` in all your resolvers
  // This is just an example of something you might want to do in your ctx fn
  const getUserFromHeader = async () => {
    if (req.headers.authorization) {
      const token = req.headers.authorization.replace("Bearer ", "");
      const payload: any = jwt.verify(token, process.env.SECRET);
      const userId = payload.userId ?? "";
      const user = await prisma.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
      });
      return user;
    }
    return null;
  };
  const user = await getUserFromHeader();
  return {
    user,
  };
};
type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create();

const router = t.router({
  getUser: t.procedure.input(z.string()).query(({ input, ctx }) => {
    return `hello ${ctx.user?.id ?? input}`;
  }),
  postStash: t.procedure.input(z.object({text:z.string(),timestamp:z.string()})).mutation(async ({ input, ctx }) => {
    const { text, timestamp } = input;
    if (!ctx.user) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You have to login first.",
      });
    }
    const stash = await prisma.stash.create({
      data: {
        text: text,
        userId: ctx.user.id,
        timestamp: timestamp,
      },
    });
    return stash;
  }),
  getStashes: t.procedure.query(({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You have to login first.",
      });
    }
    return prisma.stash.findMany({
      where: {
        userId: ctx.user.id,
      },
    });
  }),
  deleteStash: t.procedure.input(z.number()).mutation(async ({ input, ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You have to login first.",
      });
    }
    await prisma.stash.delete({
      where: {
        id: input,
      },
    });
    return input;
  }),
});

// Define main function
(async () => {
  const app = express();
  passport.serializeUser((user: any, done) => {
    done(null, user);
  });
  app.use(passport.initialize());

  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "http://127.0.0.1:3000/auth/github/callback",
      },
      async (_, __, profile, cb) => {
        let user = await prisma.user.findUnique({
          where: {
            githubId: profile.id,
          },
        });
        if (!user) {
          user = await prisma.user.create({
            data: {
              githubId: profile.id,
            },
          });
        }
        cb(null, {
          accessToken: jwt.sign({ userId: user.id }, process.env.SECRET, {
            expiresIn: "1y",
          }),
        });
      }
    )
  );

  app.get("/auth/github", passport.authenticate("github", { session: false }));

  app.get(
    "/auth/github/callback",
    passport.authenticate("github", { session: false }),
    (req: any, res: any) => {
      // This localhost is okay because the server we're trying to reach
      // is indeed... local.
      res.redirect(`http://localhost:54321/auth/${req.user.accessToken}`);
    }
  );

  app.use(
    "/trpc",
    trpcExpress.createExpressMiddleware({
      router: router,
      createContext,
    })
  );
  app.listen(3000, () => {
    console.log("Server is listening on port 3000");
  });
})();

export type AppRouter = typeof router;
