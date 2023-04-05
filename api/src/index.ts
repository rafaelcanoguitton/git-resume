import express from "express";
import { z } from "zod";
import * as trpcExpress from "@trpc/server/adapters/express";
import { inferAsyncReturnType, initTRPC } from "@trpc/server";
// TRPC Context

// No context yet
const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) => ({});
type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create();

const router = t.router({
  getUser: t.procedure.input(z.string()).query((req) => {
    return req.input;
  }),
});

// Define main function
(async () => {
  const app = express();
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
