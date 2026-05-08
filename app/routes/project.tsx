import { and, desc, eq, ne } from "drizzle-orm";
import { Globe } from "lucide-react";
import { Link, redirect, useFetcher } from "react-router";
import { ProjectTimeline } from "~/components/ProjectTimeline";
import { ThemeToggle } from "~/components/ThemeToggle";
import { db } from "~/db/index.server";
import { brandValues, phaseArtifacts, phaseNotes, phaseSteps, projectBrief, projects } from "~/db/schema";
import { getPhases, type ProjectType } from "~/lib/phases";
import { getIsAdmin } from "~/lib/session.server";
import type { Route } from "./+types/project";

export function meta({ loaderData }: Route.MetaArgs) {
  const name = loaderData?.project?.name ?? "Project";
  return [{ title: `${name} — Projects` }];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const isAdmin = await getIsAdmin(request);

  if (!isAdmin) throw redirect(`/view/${params.slug}`);

  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, params.slug),
  });
  if (!project) throw new Response("Project not found", { status: 404 });

  const [brand, briefRecord, stepRecords, noteRecords, artifactRecords, recentNotes, recentClientArtifacts] = await Promise.all([
    db.query.brandValues.findFirst({ where: eq(brandValues.projectId, project.id) }),
    db.query.projectBrief.findFirst({ where: eq(projectBrief.projectId, project.id) }),
    db.select().from(phaseSteps).where(eq(phaseSteps.projectId, project.id)),
    db.select().from(phaseNotes).where(eq(phaseNotes.projectId, project.id)),
    db.select().from(phaseArtifacts).where(eq(phaseArtifacts.projectId, project.id)),
    db.select({ updatedAt: phaseNotes.updatedAt }).from(phaseNotes)
      .where(and(eq(phaseNotes.projectId, project.id), ne(phaseNotes.clientNotes, "")))
      .orderBy(desc(phaseNotes.updatedAt)).limit(1),
    db.select({ createdAt: phaseArtifacts.createdAt }).from(phaseArtifacts)
      .where(and(eq(phaseArtifacts.projectId, project.id), eq(phaseArtifacts.from, "client")))
      .orderBy(desc(phaseArtifacts.createdAt)).limit(1),
  ]);

  const projectType = (project.type ?? "website") as ProjectType;
  const phases = getPhases(projectType);

  const stepsByPhase: Record<number, boolean[]> = {};
  const completedAtByPhase: Record<number, (string | null)[]> = {};
  for (const phase of phases) {
    stepsByPhase[phase.n] = phase.steps.map((_step, i) => {
      const rec = stepRecords.find((r) => r.phaseNumber === phase.n && r.stepIndex === i);
      return rec?.completed ?? false;
    });
    completedAtByPhase[phase.n] = phase.steps.map((_step, i) => {
      const rec = stepRecords.find((r) => r.phaseNumber === phase.n && r.stepIndex === i);
      return rec?.completedAt?.toISOString() ?? null;
    });
  }

  const activityDates: Date[] = [
    ...(recentNotes[0] ? [recentNotes[0].updatedAt] : []),
    ...(recentClientArtifacts[0] ? [recentClientArtifacts[0].createdAt] : []),
  ];
  const lastClientActivityAt = activityDates.length > 0
    ? new Date(Math.max(...activityDates.map((d) => d.getTime()))).toISOString()
    : null;

  const adminNotesByPhase: Record<number, string> = {};
  const clientNotesByPhase: Record<number, string> = {};
  for (const phase of phases) {
    const rec = noteRecords.find((r) => r.phaseNumber === phase.n);
    adminNotesByPhase[phase.n] = rec?.adminNotes ?? "";
    clientNotesByPhase[phase.n] = rec?.clientNotes ?? "";
  }

  const artifactsByPhase: Record<
    number,
    { id: string; from: "admin" | "client"; label: string; url: string; createdAt: string }[]
  > = {};
  for (const phase of phases) {
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
    projectType,
    project: {
      id: project.id,
      slug: project.slug,
      name: project.name,
      type: projectType,
      status: project.status as "proposal" | "active",
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
    completedAtByPhase,
    adminNotesByPhase,
    clientNotesByPhase,
    artifactsByPhase,
    lastClientActivityAt,
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
      .values({
        projectId: project.id,
        phaseNumber,
        adminNotes: "",
        clientNotes: "",
        ...setField,
        updatedAt: new Date(),
      })
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
    await db.delete(phaseArtifacts).where(eq(phaseArtifacts.id, artifactId));
    return { ok: true };
  }

  if (intent === "confirm-project") {
    await db.update(projects).set({ status: "active" }).where(eq(projects.id, project.id));
    return { ok: true };
  }

  if (intent === "archive-project") {
    await db.delete(projects).where(eq(projects.id, project.id));
    return redirect("/");
  }

  if (intent === "delete-project") {
    await db.delete(projects).where(eq(projects.id, project.id));
    return redirect("/");
  }

  throw new Response("Unknown intent", { status: 400 });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ProjectPage({ loaderData }: Route.ComponentProps) {
  const {
    project,
    projectType,
    brand,
    brief,
    isAdmin,
    stepsByPhase,
    completedAtByPhase,
    adminNotesByPhase,
    clientNotesByPhase,
    artifactsByPhase,
    lastClientActivityAt,
  } = loaderData;
  const deleteFetcher = useFetcher();

  function handleDelete() {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    deleteFetcher.submit({ intent: "delete-project" }, { method: "post" });
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 justify-between border-b border-border bg-background px-4 sm:px-6">
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/" className="">
            <div className="flex h-7 w-10 items-center justify-center rounded-md bg-foreground">
              <span className="text-sm font-bold text-background">AS</span>
            </div>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground/40">/</span>
            <span className="hidden sm:inline text-sm font-semibold text-foreground">{project.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {lastClientActivityAt && (
            <span className="hidden md:inline text-xs text-muted-foreground px-2 py-1 rounded-md bg-secondary border border-border">
              Client active {relativeTime(lastClientActivityAt)}
            </span>
          )}
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
          <button
            onClick={handleDelete}
            disabled={deleteFetcher.state !== "idle"}
            className="rounded-md px-2 sm:px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            title="Delete project"
          >
            {deleteFetcher.state !== "idle" ? "Deleting…" : "Delete"}
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-4xl mx-auto w-full">
        {project.status === "proposal" && (
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-amber-400/30 bg-amber-400/8 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Proposal stage</p>
              <p className="text-xs text-amber-700/70 dark:text-amber-300/70 mt-0.5">
                Share the client link so they can fill in the brief and brand values. Confirm once the project is signed off.
              </p>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/view/${project.slug}`)}
                className="text-xs px-3 py-1.5 rounded-md border border-amber-400/40 text-amber-700 dark:text-amber-300 hover:bg-amber-400/10 transition-colors cursor-pointer"
              >
                Copy client link
              </button>
              <deleteFetcher.Form method="post">
                <input type="hidden" name="intent" value="archive-project" />
                <button
                  type="submit"
                  className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Archive
                </button>
              </deleteFetcher.Form>
              <deleteFetcher.Form method="post">
                <input type="hidden" name="intent" value="confirm-project" />
                <button
                  type="submit"
                  className="text-xs px-3 py-1.5 rounded-md bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors cursor-pointer"
                >
                  Confirm project
                </button>
              </deleteFetcher.Form>
            </div>
          </div>
        )}
        <ProjectTimeline
          project={project}
          projectType={projectType}
          brand={brand}
          brief={brief}
          isAdmin={isAdmin}
          initialStepsByPhase={stepsByPhase}
          initialCompletedAtByPhase={completedAtByPhase}
          initialAdminNotesByPhase={adminNotesByPhase}
          initialClientNotesByPhase={clientNotesByPhase}
          artifactsByPhase={artifactsByPhase}
        />
      </main>
    </div>
  );
}
