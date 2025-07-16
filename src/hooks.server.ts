import { sequence } from "@sveltejs/kit/hooks";
import { db, usersWithTokens } from "$lib/server/db";
import { redirect, type Handle } from "@sveltejs/kit";
import { SESSIONS_SECRET } from "$env/static/private";
import { PUBLIC_SLACK_CLIENT_ID } from "$env/static/public";
import { symmetric } from "$lib/server/crypto";
import { eq } from "drizzle-orm";

const slackMiddleware: Handle = async ({ event, resolve }) => {
  // we might not have the record yet
  if (event.url.toString().includes("slack-callback")) return resolve(event);
  if (event.url.toString().includes("/api/uploadthing")) return resolve(event);

  const start = performance.now();
  const sessionCookie = event.cookies.get("session");
  if (!sessionCookie) return resolve(event);

  let slackId;
  try {
    slackId = await symmetric.decrypt(sessionCookie, SESSIONS_SECRET)
    if (!slackId) throw new Error()
  } catch {
    event.cookies.delete("session", {
        path: "/"
    })
  }

  const [user] = await db.select().from(usersWithTokens).where(eq(usersWithTokens.slackId, slackId!)).limit(1)
  if (!user) {
    throw new Error(`Failed to get user ${slackId}, even when they have a valid session`)
  }
  event.locals.user = user;

  console.log(`slackMiddleware took ${performance.now() - start}ms`);
  return resolve(event);
};

const redirectMiddleware: Handle = async ({ event, resolve }) => {
  if (event.url.toString().includes("/api/uploadthing")) return resolve(event);
  
  if (
    !event.locals.user &&
    event.url.pathname !== "/api/slack-callback"
  ) {
    const authorizeUrl = `https://hackclub.slack.com/oauth/v2/authorize?scope=&user_scope=openid%2Cprofile%2Cemail&redirect_uri=${event.url.origin}/api/slack-callback&client_id=${PUBLIC_SLACK_CLIENT_ID}`
    return redirect(302, authorizeUrl);
  }

  if (event.locals.user && !event.locals.user.isAdmin && event.url.pathname.includes("admin")) {
    return redirect(302, "/")
  }

  return resolve(event);
};

export const handle = sequence(
  slackMiddleware,
  redirectMiddleware,
);