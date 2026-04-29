import { eq } from "drizzle-orm";
import { db } from "~/db/index.server";
import { phaseNotes, projects } from "~/db/schema";
import type { Route } from "./+types/project.shared-notes";

export async function loader({ params, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const phase = Number(url.searchParams.get("phase") ?? "1");

  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, params.slug),
  });
  if (!project) return new Response("Not found", { status: 404 });

  const record = await db.query.phaseNotes.findFirst({
    where: (t, { and }) =>
      and(eq(t.projectId, project.id), eq(t.phaseNumber, phase)),
  });

  return { clientNotes: record?.clientNotes ?? "" };
}
