import { Form, redirect } from "react-router";
import type { Route } from "./+types/view";
import { db } from "~/db/index.server";
import { projects } from "~/db/schema";
import { eq } from "drizzle-orm";
import { Input } from "~/components/ui/input";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Client Portal — Studio" },
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

  return redirect(`/view/${project.slug}`);
}

export default function ClientEntry({ actionData }: Route.ComponentProps) {
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
          <h1 className="text-2xl font-semibold text-foreground mb-1">Your project</h1>
          <p className="text-sm text-muted-foreground">
            Enter the project code your designer shared with you.
          </p>
        </div>

        <Form method="post" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Project code
            </label>
            <Input
              type="text"
              name="code"
              placeholder="e.g. abc12345"
              autoComplete="off"
              autoFocus
              className="h-10 text-center font-mono tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-sans"
            />
          </div>

          {actionData?.error && (
            <p className="text-sm text-red-400 text-center">{actionData.error}</p>
          )}

          <button
            type="submit"
            className="rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 cursor-pointer"
          >
            Open my project
          </button>
        </Form>
      </div>
    </main>
  );
}
