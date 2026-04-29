import { Form, redirect } from "react-router";
import type { Route } from "./+types/home";
import { db } from "~/db/index.server";
import { projects } from "~/db/schema";
import { eq } from "drizzle-orm";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Client Project Portal" },
    { name: "description", content: "Access your web project overview." },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toLowerCase();

  if (!code) return { error: "Please enter a project code." };

  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, code),
  });

  if (!project) {
    return { error: "Project code not found. Check with your project manager." };
  }

  return redirect(`/project/${project.slug}`);
}

export default function Home({ actionData }: Route.ComponentProps) {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Heading */}
        <div className="mb-8">
          <p className="font-display text-[10px] font-semibold tracking-[0.18em] uppercase text-muted mb-3">
            Project Portal
          </p>
          <h1 className="font-display text-4xl font-extrabold text-text leading-tight mb-3">
            Welcome to your
            <br />
            <span className="text-p1">Project Overview</span>
          </h1>
          <p className="text-muted text-[15px]">
            Enter the project code your web designer shared with you.
          </p>
        </div>

        {/* Code form */}
        <Form method="post">
          <input
            type="text"
            name="code"
            placeholder="e.g. abc12345"
            autoComplete="off"
            autoFocus
            className="w-full bg-surface border border-white/7 rounded-xl px-4 py-3.5 text-text font-display font-semibold tracking-widest uppercase text-center text-lg outline-none focus:border-p1/50 placeholder:text-faint placeholder:normal-case placeholder:tracking-normal placeholder:font-normal transition-colors mb-3"
          />
          {actionData?.error && (
            <p className="text-red-400 text-sm text-center mb-3">
              {actionData.error}
            </p>
          )}
          <button
            type="submit"
            className="w-full bg-p1 hover:bg-p1/90 text-white font-display font-bold text-sm py-3.5 rounded-xl transition-colors"
          >
            Open My Project
          </button>
        </Form>

        {/* Admin link */}
        <div className="mt-10 text-center">
          <a
            href="/admin-login"
            className="font-display text-[11px] font-semibold tracking-widest uppercase text-faint hover:text-muted transition-colors"
          >
            Admin Login
          </a>
        </div>
      </div>
    </main>
  );
}
