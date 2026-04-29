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

export async function requireAdmin(request: Request): Promise<void> {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.get("isAdmin")) {
    throw redirect("/admin-login");
  }
}
