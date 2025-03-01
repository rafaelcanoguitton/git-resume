import { Context, Hono } from "hono";
import type { Environment } from "./bindings";
import { eq } from "drizzle-orm";
import { users } from "./db/schema";
import { sign } from "hono/jwt";

interface GithubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GithubUser {
  id: number;
  login: string;
  name?: string;
  email?: string;
}

const authRouter = new Hono<Environment>();

// Initiate GitHub OAuth flow
authRouter.get("/github/login", async (c) => {
  const githubUrl = new URL("https://github.com/login/oauth/authorize");
  githubUrl.searchParams.append("client_id", c.env.GITHUB_CLIENT_ID);
  githubUrl.searchParams.append(
    "redirect_uri",
    "http://localhost:8787/auth/github/callback",
  );
  githubUrl.searchParams.append("scope", "read:user user:email");

  return c.redirect(githubUrl.toString());
});

// Handle GitHub callback
authRouter.get("/github/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.text("No code provided", 400);

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = (await tokenRes.json()) as GithubTokenResponse;
  if (!tokenData.access_token) return c.text("Failed to get access token", 400);

  // Get user data from GitHub
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/json",
      "User-Agent": "git-resume",
    },
  });

  const githubUser = (await userRes.json()) as GithubUser;

  // Find or create user
  let user = await c.get("db").query.users.findFirst({
    where: eq(users.githubId, githubUser.id.toString()),
  });

  if (!user) {
    const result = (await c
      .get("db")
      .insert(users)
      .values({
        githubId: githubUser.id.toString(),
      })
      .returning({ id: users.id }));

    // Create JWT
    const token = await sign(
      {
        userId: result[0].id,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
      },
      c.env.JWT_SECRET,
    );

    return c.json({ token });
  }

  // Create JWT for existing user
  const token = await sign(
    {
      userId: user.id,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    },
    c.env.JWT_SECRET,
  );

  return c.json({ token });
});

export { authRouter };
