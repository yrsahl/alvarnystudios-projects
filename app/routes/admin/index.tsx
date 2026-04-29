import { desc } from "drizzle-orm";
import { Form, Link, redirect } from "react-router";
import { db } from "~/db/index.server";
import { projects } from "~/db/schema";
import { destroySession, getSession } from "~/lib/session.server";
import type { Route } from "./+types/index";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Admin — Projects" }];
}

export async function loader(_: Route.LoaderArgs) {
  const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));
  return { projects: allProjects };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  if (formData.get("intent") === "logout") {
    const session = await getSession(request.headers.get("Cookie"));
    return redirect("/", {
      headers: { "Set-Cookie": await destroySession(session) },
    });
  }
  return null;
}

export default function AdminIndex({ loaderData }: Route.ComponentProps) {
  const { projects } = loaderData;

  return (
    <main className="min-h-screen bg-bg py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="font-display text-[10px] font-semibold tracking-[0.18em] uppercase text-muted mb-2">Admin</p>
            <h1 className="font-display text-3xl font-extrabold text-text">Projects</h1>
          </div>
          <div className="flex items-center gap-3">
            <Form method="post">
              <input type="hidden" name="intent" value="logout" />
              <button className="font-display text-[11px] font-semibold tracking-widest uppercase text-faint hover:text-muted border border-white/7 hover:border-white/15 rounded-lg px-3 py-2 transition-colors cursor-pointer">
                Log out
              </button>
            </Form>
            <Link
              to="/admin/new"
              className="font-display text-[11px] font-bold tracking-widest uppercase bg-p1 hover:bg-p1/90 text-white px-4 py-2.5 rounded-lg transition-colors"
            >
              + New Project
            </Link>
          </div>
        </div>

        {/* Project list */}
        {projects.length === 0 ? (
          <div className="bg-surface border border-white/7 rounded-2xl p-12 text-center">
            <p className="text-muted mb-4">No projects yet.</p>
            <Link to="/admin/new" className="text-p1 font-display font-semibold text-sm hover:underline">
              Create your first project →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-surface border border-white/7 rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="font-display font-bold text-text text-[15px]">{project.name}</div>
                  {(project.clientName || project.businessName) && (
                    <div className="text-muted text-[13px] mt-0.5">
                      {[project.clientName, project.businessName].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <code className="font-display text-sm font-bold text-muted bg-surface2 border border-white/7 px-3 py-1.5 rounded-lg tracking-widest">
                    {project.slug}
                  </code>
                  <CopyLinkButton slug={project.slug} />
                  <Link
                    to={`/project/${project.slug}`}
                    className="font-display text-[11px] font-semibold tracking-widest uppercase text-p1 hover:text-p1/80 border border-p1/30 hover:border-p1/60 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function CopyLinkButton({ slug }: { slug: string }) {
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(`${window.location.origin}/project/${slug}`);
      }}
      className="font-display text-[11px] font-semibold tracking-widest uppercase text-faint hover:text-muted border border-white/7 hover:border-white/15 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
    >
      Copy link
    </button>
  );
}
