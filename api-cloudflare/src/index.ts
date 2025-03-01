import { Hono } from "hono";
import { initDbConnect } from "./db";
import type { Context, Next } from "hono";
import { Environment } from "./bindings";
import { authMiddleware } from "./middleware";
import stashRouter from "./stashrouter";
import { authRouter } from "./authrouter";

const app = new Hono();

app.use("*", async (c: Context<Environment>, next: Next) => {
  c.set("db", initDbConnect(c.env.DB));
  await next();
});

app.get("/", async (c: Context<Environment>) => {
  console.log(c.env);
  console.log(process.env);
  return c.text("Hello Hono!");
});

app.route("auth", authRouter);
app.use("*", authMiddleware);
app.route("stash", stashRouter);


export default app;
