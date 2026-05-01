import { eq } from "drizzle-orm";
import { ProjectTimeline } from "~/components/ProjectTimeline";
import { db } from "~/db/index.server";
import { brandValues, phaseNotes, phaseSteps, projectBrief, projects } from "~/db/schema";
import { PHASES } from "~/lib/phases";
import type { Route } from "./+types/view.$slug";

export function meta({ data: loaderData }: Route.MetaArgs) {
  const name = (loaderData?.project?.businessName || loaderData?.project?.name) ?? "Project";
  return [{ title: `${name} — Project Overview` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, params.slug),
  });
  if (!project) throw new Response("Project not found", { status: 404 });

  const [brand, briefRecord, stepRecords, noteRecords] = await Promise.all([
    db.query.brandValues.findFirst({ where: eq(brandValues.projectId, project.id) }),
    db.query.projectBrief.findFirst({ where: eq(projectBrief.projectId, project.id) }),
    db.select().from(phaseSteps).where(eq(phaseSteps.projectId, project.id)),
    db.select().from(phaseNotes).where(eq(phaseNotes.projectId, project.id)),
  ]);

  const stepsByPhase: Record<number, boolean[]> = {};
  for (const phase of PHASES) {
    stepsByPhase[phase.n] = phase.steps.map((_, i) => {
      const rec = stepRecords.find((r) => r.phaseNumber === phase.n && r.stepIndex === i);
      return rec?.completed ?? false;
    });
  }

  const clientNotesByPhase: Record<number, string> = {};
  for (const phase of PHASES) {
    const rec = noteRecords.find((r) => r.phaseNumber === phase.n);
    clientNotesByPhase[phase.n] = rec?.clientNotes ?? "";
  }

  return {
    project: {
      id: project.id,
      slug: project.slug,
      name: project.name,
      clientName: project.clientName,
      businessName: project.businessName,
      startDate: project.startDate,
    },
    brand: brand ?? {
      primaryColor: "#5B8CFF",
      secondaryColor: "#A78BFA",
      accentColor: "#34D399",
      bgColor: "#0e0e0f",
      textColor: "#F0EFE8",
      headingFont: "",
      bodyFont: "",
    },
    brief: {
      needsBrand: briefRecord?.needsBrand ?? null,
      pageCount: briefRecord?.pageCount ?? null,
      features: briefRecord?.features ?? "",
      timeline: briefRecord?.timeline ?? "",
      budget: briefRecord?.budget ?? "",
      hasRetainer: briefRecord?.hasRetainer ?? null,
      retainerAmount: briefRecord?.retainerAmount ?? "",
    },
    stepsByPhase,
    adminNotesByPhase: {} as Record<number, string>,
    clientNotesByPhase,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, params.slug),
  });
  if (!project) throw new Response("Project not found", { status: 404 });

  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  // Clients may toggle their own steps
  if (intent === "toggle-step") {
    const phaseNumber = Number(formData.get("phaseNumber"));
    const stepIndex = Number(formData.get("stepIndex"));
    const completed = formData.get("completed") === "true";

    const phase = PHASES.find((p) => p.n === phaseNumber);
    const step = phase?.steps[stepIndex];
    if (!step?.clientOwned) throw new Response("Forbidden", { status: 403 });

    await db
      .insert(phaseSteps)
      .values({ projectId: project.id, phaseNumber, stepIndex, completed, completedAt: completed ? new Date() : null })
      .onConflictDoUpdate({
        target: [phaseSteps.projectId, phaseSteps.phaseNumber, phaseSteps.stepIndex],
        set: { completed, completedAt: completed ? new Date() : null },
      });
    return { ok: true };
  }

  // Clients may write shared notes
  if (intent === "update-notes") {
    const noteType = String(formData.get("noteType"));
    if (noteType !== "client") throw new Response("Forbidden", { status: 403 });

    const phaseNumber = Number(formData.get("phaseNumber"));
    const notes = String(formData.get("notes") || "");
    await db
      .insert(phaseNotes)
      .values({ projectId: project.id, phaseNumber, adminNotes: "", clientNotes: notes, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [phaseNotes.projectId, phaseNotes.phaseNumber],
        set: { clientNotes: notes, updatedAt: new Date() },
      });
    return { ok: true };
  }

  throw new Response("Forbidden", { status: 403 });
}

export default function ClientProjectView({ loaderData }: Route.ComponentProps) {
  const { project, brand, brief, stepsByPhase, adminNotesByPhase, clientNotesByPhase } = loaderData;

  return (
    <main className="min-h-screen bg-bg py-12 px-6">
      <div className="max-w-215 mx-auto">
        <div className="mb-12">
          <p className="font-display text-[10px] font-semibold tracking-[0.18em] uppercase text-muted mb-3">
            {project.businessName || project.name}
          </p>
          <h1 className="font-display text-4xl font-extrabold text-text leading-tight mb-3">
            {project.clientName ? `${project.clientName}'s` : "Your"}{" "}
            <span className="text-p1">Project</span>
            <br />
            Overview
          </h1>
          <p className="text-muted text-[15px] max-w-md">
            Track the progress of your project and complete your action items below.
          </p>
        </div>

        <ProjectTimeline
          project={project}
          brand={brand}
          brief={brief}
          isAdmin={false}
          initialStepsByPhase={stepsByPhase}
          initialAdminNotesByPhase={adminNotesByPhase}
          initialClientNotesByPhase={clientNotesByPhase}
        />
      </div>
    </main>
  );
}
