import { createCookieSessionStorage, redirect } from "react-router";

interface SessionData {
  isAdmin: boolean;
}

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData>({
    cookie: {
      name: "pm_session",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      secrets: [process.env.SESSION_SECRET ?? "dev-secret-please-change"],
      secure: process.env.NODE_ENV === "production",
    },
  });

export { getSession, commitSession, destroySession };

const DEV = process.env.NODE_ENV === "development";

export async function requireAdmin(request: Request): Promise<void> {
  if (DEV) return;
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.get("isAdmin")) {
    throw redirect("/admin-login");
  }
}

export async function getIsAdmin(request: Request): Promise<boolean> {
  if (DEV) return true;
  const session = await getSession(request.headers.get("Cookie"));
  return session.get("isAdmin") ?? false;
}
