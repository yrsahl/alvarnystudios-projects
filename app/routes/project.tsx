import { eq } from "drizzle-orm";
import { Link, redirect } from "react-router";
import { ProjectTimeline } from "~/components/ProjectTimeline";
import { db } from "~/db/index.server";
import { brandValues, phaseNotes, phaseSteps, projectBrief, projects } from "~/db/schema";
import { PHASES } from "~/lib/phases";
import { getSession } from "~/lib/session.server";
import type { Route } from "./+types/project";

export function meta({ data: loaderData }: Route.MetaArgs) {
  const name = loaderData?.project?.name ?? "Project";
  return [{ title: `${name} — Project Overview` }];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const isAdmin = session.get("isAdmin") ?? false;

  if (!isAdmin) {
    throw redirect(`/view/${params.slug}`);
  }

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

  const adminNotesByPhase: Record<number, string> = {};
  const clientNotesByPhase: Record<number, string> = {};
  for (const phase of PHASES) {
    const rec = noteRecords.find((r) => r.phaseNumber === phase.n);
    adminNotesByPhase[phase.n] = rec?.adminNotes ?? "";
    clientNotesByPhase[phase.n] = rec?.clientNotes ?? "";
  }

  return {
    isAdmin,
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
    adminNotesByPhase,
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

  if (intent === "toggle-step") {
    const phaseNumber = Number(formData.get("phaseNumber"));
    const stepIndex = Number(formData.get("stepIndex"));
    const completed = formData.get("completed") === "true";
    await db
      .insert(phaseSteps)
      .values({ projectId: project.id, phaseNumber, stepIndex, completed, completedAt: completed ? new Date() : null })
      .onConflictDoUpdate({
        target: [phaseSteps.projectId, phaseSteps.phaseNumber, phaseSteps.stepIndex],
        set: { completed, completedAt: completed ? new Date() : null },
      });
    return { ok: true };
  }

  if (intent === "update-brand") {
    const vals = {
      primaryColor: String(formData.get("primaryColor") || "#5B8CFF"),
      secondaryColor: String(formData.get("secondaryColor") || "#A78BFA"),
      accentColor: String(formData.get("accentColor") || "#34D399"),
      bgColor: String(formData.get("bgColor") || "#0e0e0f"),
      textColor: String(formData.get("textColor") || "#F0EFE8"),
      headingFont: String(formData.get("headingFont") || ""),
      bodyFont: String(formData.get("bodyFont") || ""),
      updatedAt: new Date(),
    };
    await db
      .insert(brandValues)
      .values({ projectId: project.id, ...vals })
      .onConflictDoUpdate({ target: brandValues.projectId, set: vals });
    return { ok: true };
  }

  if (intent === "update-notes") {
    const phaseNumber = Number(formData.get("phaseNumber"));
    const noteType = String(formData.get("noteType"));
    const notes = String(formData.get("notes") || "");
    const setField = noteType === "admin" ? { adminNotes: notes } : { clientNotes: notes };
    await db
      .insert(phaseNotes)
      .values({ projectId: project.id, phaseNumber, adminNotes: "", clientNotes: "", ...setField, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [phaseNotes.projectId, phaseNotes.phaseNumber],
        set: { ...setField, updatedAt: new Date() },
      });
    return { ok: true };
  }

  if (intent === "update-brief") {
    const vals = {
      needsBrand: formData.get("needsBrand") === "" ? null : formData.get("needsBrand") === "true",
      pageCount: formData.get("pageCount") === "" ? null : Number(formData.get("pageCount")),
      features: String(formData.get("features") || ""),
      timeline: String(formData.get("timeline") || ""),
      budget: String(formData.get("budget") || ""),
      hasRetainer: formData.get("hasRetainer") === "" ? null : formData.get("hasRetainer") === "true",
      retainerAmount: String(formData.get("retainerAmount") || ""),
      updatedAt: new Date(),
    };
    await db
      .insert(projectBrief)
      .values({ projectId: project.id, ...vals })
      .onConflictDoUpdate({ target: projectBrief.projectId, set: vals });
    return { ok: true };
  }

  if (intent === "update-info") {
    await db
      .update(projects)
      .set({
        clientName: String(formData.get("clientName") || ""),
        businessName: String(formData.get("businessName") || ""),
        startDate: formData.get("startDate") ? String(formData.get("startDate")) : null,
      })
      .where(eq(projects.id, project.id));
    return { ok: true };
  }

  throw new Response("Unknown intent", { status: 400 });
}

export default function ProjectPage({ loaderData }: Route.ComponentProps) {
  const { project, brand, brief, isAdmin, stepsByPhase, adminNotesByPhase, clientNotesByPhase } = loaderData;

  return (
    <main className="min-h-screen bg-bg py-12 px-6">
      <div className="max-w-215 mx-auto">
        {/* Back link */}
        <div className="mb-8">
          <Link
            to="/"
            className="font-display text-[11px] font-semibold tracking-widest uppercase text-faint hover:text-muted transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="mb-12">
          <p className="font-display text-[10px] font-semibold tracking-[0.18em] uppercase text-muted mb-3">
            Freelance Workflow
          </p>
          <h1 className="font-display text-4xl font-extrabold text-text leading-tight mb-3">
            Local Business <span className="text-p1">Web</span>
            <br />
            Client Playbook
          </h1>
          <p className="text-muted text-[15px] max-w-md">
            From first discovery call to recurring retainer income — track progress live with your client.
          </p>
        </div>

        <ProjectTimeline
          project={project}
          brand={brand}
          brief={brief}
          isAdmin={isAdmin}
          initialStepsByPhase={stepsByPhase}
          initialAdminNotesByPhase={adminNotesByPhase}
          initialClientNotesByPhase={clientNotesByPhase}
        />

        {/* Footer stats — admin only */}
        {isAdmin && (
          <footer className="mt-12 bg-surface border border-white/7 rounded-2xl px-6 py-5 flex justify-between items-center flex-wrap gap-4">
            {[
              { val: "~10 days", lbl: "Discovery to launch" },
              { val: "Next.js", lbl: "Core framework" },
              { val: "Sanity", lbl: "CMS for clients" },
              { val: "€800–3k", lbl: "Per project" },
              { val: "€100–300", lbl: "Monthly retainer" },
            ].map((stat, i, arr) => (
              <div key={stat.val} className="flex items-center gap-4">
                <div className="text-center">
                  <div className="font-display text-xl font-extrabold text-text">{stat.val}</div>
                  <div className="text-[11px] text-muted mt-0.5">{stat.lbl}</div>
                </div>
                {i < arr.length - 1 && <div className="w-px h-9 bg-white/7" />}
              </div>
            ))}
          </footer>
        )}
      </div>
    </main>
  );
}
