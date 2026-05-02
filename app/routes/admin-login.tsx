import { Form, redirect } from "react-router";
import type { Route } from "./+types/admin-login";
import { getSession, commitSession } from "~/lib/session.server";
import { Input } from "~/components/ui/input";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Admin Login — Studio" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (session.get("isAdmin")) throw redirect("/");
  return null;
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
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo mark */}
        <div className="flex items-center gap-2 mb-10">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground">
            <span className="text-sm font-bold text-background">S</span>
          </div>
          <span className="text-sm font-semibold text-foreground">Studio</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your admin dashboard.</p>
        </div>

        <Form method="post" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Password
            </label>
            <Input
              type="password"
              name="password"
              autoFocus
              className="h-10"
            />
          </div>

          {actionData?.error && (
            <p className="text-sm text-red-400">{actionData.error}</p>
          )}

          <button
            type="submit"
            className="mt-1 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 cursor-pointer"
          >
            Sign in
          </button>
        </Form>

        <div className="mt-8 pt-6 border-t border-border text-center">
          <a
            href="/view"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Client Portal
          </a>
        </div>
      </div>
    </main>
  );
}
