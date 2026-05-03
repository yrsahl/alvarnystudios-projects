import { eq } from "drizzle-orm";
import { Globe } from "lucide-react";
import { Link, redirect } from "react-router";
import { ThemeToggle } from "~/components/ThemeToggle";
import { ProjectTimeline } from "~/components/ProjectTimeline";
import { db } from "~/db/index.server";
import { brandValues, phaseArtifacts, phaseNotes, phaseSteps, projectBrief, projects } from "~/db/schema";
import { PHASES } from "~/lib/phases";
import { getSession } from "~/lib/session.server";
import type { Route } from "./+types/project";

export function meta({ loaderData }: Route.MetaArgs) {
  const name = loaderData?.project?.name ?? "Project";
  return [{ title: `${name} — Studio` }];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const isAdmin = session.get("isAdmin") ?? false;

  if (!isAdmin) throw redirect(`/view/${params.slug}`);

  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, params.slug),
  });
  if (!project) throw new Response("Project not found", { status: 404 });

  const [brand, briefRecord, stepRecords, noteRecords, artifactRecords] = await Promise.all([
    db.query.brandValues.findFirst({ where: eq(brandValues.projectId, project.id) }),
    db.query.projectBrief.findFirst({ where: eq(projectBrief.projectId, project.id) }),
    db.select().from(phaseSteps).where(eq(phaseSteps.projectId, project.id)),
    db.select().from(phaseNotes).where(eq(phaseNotes.projectId, project.id)),
    db.select().from(phaseArtifacts).where(eq(phaseArtifacts.projectId, project.id)),
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

  const artifactsByPhase: Record<number, { id: string; from: "admin" | "client"; label: string; url: string; createdAt: string }[]> = {};
  for (const phase of PHASES) {
    artifactsByPhase[phase.n] = artifactRecords
      .filter((a) => a.phaseNumber === phase.n)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((a) => ({
        id: a.id,
        from: a.from as "admin" | "client",
        label: a.label,
        url: a.url,
        createdAt: a.createdAt.toISOString(),
      }));
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
      bgColor: "#ffffff",
      textColor: "#111111",
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
    artifactsByPhase,
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

  if (intent === "add-artifact") {
    const from = String(formData.get("from"));
    if (from !== "admin" && from !== "client") throw new Response("Invalid from", { status: 400 });
    const label = String(formData.get("label") || "").trim();
    if (!label) throw new Response("Label required", { status: 400 });
    await db.insert(phaseArtifacts).values({
      projectId: project.id,
      phaseNumber: Number(formData.get("phaseNumber")),
      from,
      label,
      url: String(formData.get("url") || "").trim(),
    });
    return { ok: true };
  }

  if (intent === "delete-artifact") {
    const artifactId = String(formData.get("artifactId"));
    await db.delete(phaseArtifacts).where(
      eq(phaseArtifacts.id, artifactId),
    );
    return { ok: true };
  }

  throw new Response("Unknown intent", { status: 400 });
}

export default function ProjectPage({ loaderData }: Route.ComponentProps) {
  const { project, brand, brief, isAdmin, stepsByPhase, adminNotesByPhase, clientNotesByPhase, artifactsByPhase } = loaderData;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 justify-between border-b border-border bg-background px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
            <span className="text-sm font-bold text-background">S</span>
          </div>
          <span className="hidden sm:inline text-sm font-semibold text-foreground">Studio</span>
        </Link>

        <p className="text-sm font-medium text-foreground truncate min-w-0">{project.name}</p>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={`/view/${project.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Open client view"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Client view</span>
          </a>
          <Link
            to="/"
            className="hidden sm:block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            ← Dashboard
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-4xl mx-auto w-full">
        <ProjectTimeline
          project={project}
          brand={brand}
          brief={brief}
          isAdmin={isAdmin}
          initialStepsByPhase={stepsByPhase}
          initialAdminNotesByPhase={adminNotesByPhase}
          initialClientNotesByPhase={clientNotesByPhase}
          artifactsByPhase={artifactsByPhase}
        />
      </main>
    </div>
  );
}
