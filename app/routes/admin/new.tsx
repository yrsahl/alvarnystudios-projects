import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/new";
import { db } from "~/db/index.server";
import { projects, brandValues } from "~/db/schema";
import { nanoid } from "nanoid";

export function meta(_: Route.MetaArgs) {
  return [{ title: "New Project — Admin" }];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();

  if (!name) return { error: "Project name is required." };

  const slug = nanoid(8).toLowerCase();

  const [project] = await db
    .insert(projects)
    .values({ slug, name, clientName, businessName })
    .returning();

  // Seed default brand values
  await db.insert(brandValues).values({ projectId: project.id });

  return redirect(`/admin?created=${slug}`);
}

export default function AdminNew({ actionData }: Route.ComponentProps) {
  return (
    <main className="min-h-screen bg-bg py-12 px-6">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <Link
            to="/admin"
            className="font-display text-[11px] font-semibold tracking-widest uppercase text-faint hover:text-muted transition-colors"
          >
            ← Back
          </Link>
        </div>

        <h1 className="font-display text-3xl font-extrabold text-text mb-8">
          New Project
        </h1>

        <Form method="post" className="flex flex-col gap-4">
          {[
            {
              name: "name",
              label: "Project Name",
              placeholder: "Smith Bakery Website",
              required: true,
            },
            {
              name: "clientName",
              label: "Client Name",
              placeholder: "Jane Smith",
              required: false,
            },
            {
              name: "businessName",
              label: "Business Name",
              placeholder: "Smith Bakery",
              required: false,
            },
          ].map((field) => (
            <div key={field.name}>
              <label className="block font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-muted mb-1.5">
                {field.label}
                {field.required && (
                  <span className="text-red-400 ml-1">*</span>
                )}
              </label>
              <input
                type="text"
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full bg-surface border border-white/7 rounded-xl px-4 py-3 text-text text-sm outline-none focus:border-p1/50 placeholder:text-faint transition-colors"
              />
            </div>
          ))}

          {actionData?.error && (
            <p className="text-red-400 text-sm">{actionData.error}</p>
          )}

          <button
            type="submit"
            className="mt-2 bg-p1 hover:bg-p1/90 text-white font-display font-bold text-sm py-3.5 rounded-xl transition-colors"
          >
            Create Project
          </button>
        </Form>
      </div>
    </main>
  );
}
