import { Form, redirect } from "react-router";
import type { Route } from "./+types/admin-login";
import { getSession, commitSession } from "~/lib/session.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Admin Login" }];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return { error: "Incorrect password." };
  }

  const session = await getSession(request.headers.get("Cookie"));
  session.set("isAdmin", true);

  return redirect("/", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}

export default function AdminLogin({ actionData }: Route.ComponentProps) {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <div className="mb-8">
          <p className="font-display text-[10px] font-semibold tracking-[0.18em] uppercase text-muted mb-3">
            Admin Access
          </p>
          <h1 className="font-display text-3xl font-extrabold text-text">
            Log in
          </h1>
        </div>

        <Form method="post">
          <label className="block font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-muted mb-1.5">
            Password
          </label>
          <input
            type="password"
            name="password"
            autoFocus
            className="w-full bg-surface border border-white/7 rounded-xl px-4 py-3 text-text text-sm outline-none focus:border-p1/50 transition-colors mb-3"
          />
          {actionData?.error && (
            <p className="text-red-400 text-sm mb-3">{actionData.error}</p>
          )}
          <button
            type="submit"
            className="w-full bg-p1 hover:bg-p1/90 text-white font-display font-bold text-sm py-3.5 rounded-xl transition-colors"
          >
            Log in
          </button>
        </Form>

        <div className="mt-8 text-center">
          <a
            href="/view"
            className="font-display text-[11px] font-semibold tracking-widest uppercase text-faint hover:text-muted transition-colors"
          >
            ← Client Portal
          </a>
        </div>
      </div>
    </main>
  );
}
