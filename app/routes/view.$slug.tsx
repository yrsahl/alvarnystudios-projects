import { eq } from "drizzle-orm";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { ProjectTimeline } from "~/components/ProjectTimeline";
import { db } from "~/db/index.server";
import { brandValues, phaseArtifacts, phaseNotes, phaseStatuses, phaseSteps, projectBrief, projects } from "~/db/schema";
import { getPhases, type ArtifactType, type PhaseStatus, type ProjectType } from "~/lib/phases";
import type { Route } from "./+types/view.$slug";

export function meta({ loaderData }: Route.MetaArgs) {
  const name = (loaderData?.project?.businessName || loaderData?.project?.name) ?? "Project";
  return [{ title: `${name} — Studio` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, params.slug),
  });
  if (!project) throw new Response("Project not found", { status: 404 });

  const projectType = (project.type ?? "website") as ProjectType;
  const phases = getPhases(projectType);

  const [brand, briefRecord, stepRecords, noteRecords, artifactRecords, statusRecords] = await Promise.all([
    db.query.brandValues.findFirst({ where: eq(brandValues.projectId, project.id) }),
    db.query.projectBrief.findFirst({ where: eq(projectBrief.projectId, project.id) }),
    db.select().from(phaseSteps).where(eq(phaseSteps.projectId, project.id)),
    db.select().from(phaseNotes).where(eq(phaseNotes.projectId, project.id)),
    db.select().from(phaseArtifacts).where(eq(phaseArtifacts.projectId, project.id)),
    db.select().from(phaseStatuses).where(eq(phaseStatuses.projectId, project.id)),
  ]);

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

  const clientNotesByPhase: Record<number, string> = {};
  for (const phase of phases) {
    const rec = noteRecords.find((r) => r.phaseNumber === phase.n);
    clientNotesByPhase[phase.n] = rec?.clientNotes ?? "";
  }

  const artifactsByPhase: Record<number, { id: string; from: "admin" | "client"; label: string; url: string; artifactType: ArtifactType; createdAt: string }[]> = {};
  for (const phase of phases) {
    artifactsByPhase[phase.n] = artifactRecords
      .filter((a) => a.phaseNumber === phase.n)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((a) => ({
        id: a.id,
        from: a.from as "admin" | "client",
        label: a.label,
        url: a.url,
        artifactType: a.artifactType as ArtifactType,
        createdAt: a.createdAt.toISOString(),
      }));
  }

  // Phase 0: auto-derive from project status; others from DB
  const phaseStatusByPhase: Record<number, { status: PhaseStatus; revisionNote: string }> = {};
  for (const phase of phases) {
    const rec = statusRecords.find((r) => r.phaseNumber === phase.n);
    if (phase.n === 0) {
      phaseStatusByPhase[0] = {
        status: project.status === "active" ? "approved" : "in_progress",
        revisionNote: "",
      };
    } else {
      phaseStatusByPhase[phase.n] = {
        status: (rec?.status ?? "not_started") as PhaseStatus,
        revisionNote: rec?.revisionNote ?? "",
      };
    }
  }

  return {
    projectType,
    project: {
      id: project.id,
      slug: project.slug,
      name: project.name,
      status: project.status as "proposal" | "active",
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
    completedAtByPhase,
    adminNotesByPhase: {} as Record<number, string>,
    clientNotesByPhase,
    artifactsByPhase,
    phaseStatusByPhase,
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

    const projectType = (project.type ?? "website") as ProjectType;
    const phase = getPhases(projectType).find((p) => p.n === phaseNumber);
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

  if (intent === "approve-phase") {
    const phaseNumber = Number(formData.get("phaseNumber"));
    await db
      .insert(phaseStatuses)
      .values({ projectId: project.id, phaseNumber, status: "approved", approvedAt: new Date(), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [phaseStatuses.projectId, phaseStatuses.phaseNumber],
        set: { status: "approved", approvedAt: new Date(), updatedAt: new Date() },
      });
    return { ok: true };
  }

  if (intent === "request-revision") {
    const phaseNumber = Number(formData.get("phaseNumber"));
    const revisionNote = String(formData.get("revisionNote") || "").trim();
    await db
      .insert(phaseStatuses)
      .values({ projectId: project.id, phaseNumber, status: "revision_requested", revisionNote, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [phaseStatuses.projectId, phaseStatuses.phaseNumber],
        set: { status: "revision_requested", revisionNote, updatedAt: new Date() },
      });
    return { ok: true };
  }

  if (intent === "add-artifact") {
    const from = String(formData.get("from"));
    if (from !== "client") throw new Response("Forbidden", { status: 403 });
    const label = String(formData.get("label") || "").trim();
    if (!label) throw new Response("Label required", { status: 400 });
    await db.insert(phaseArtifacts).values({
      projectId: project.id,
      phaseNumber: Number(formData.get("phaseNumber")),
      from: "client",
      label,
      url: String(formData.get("url") || "").trim(),
      artifactType: "file",
    });
    return { ok: true };
  }

  if (intent === "delete-artifact") {
    const artifactId = String(formData.get("artifactId"));
    const artifact = await db.query.phaseArtifacts.findFirst({
      where: eq(phaseArtifacts.id, artifactId),
    });
    if (!artifact || artifact.projectId !== project.id || artifact.from !== "client") {
      throw new Response("Forbidden", { status: 403 });
    }
    await db.delete(phaseArtifacts).where(eq(phaseArtifacts.id, artifactId));
    return { ok: true };
  }

  throw new Response("Forbidden", { status: 403 });
}

const serif = "'Instrument Serif', 'Times New Roman', serif";
const mono  = "'Geist Mono', ui-monospace, monospace";
const sans  = "'Geist', ui-sans-serif, system-ui, sans-serif";
const paper = "#fafaf7";
const ink   = "#1a1a1a";
const ink3  = "#52525b";
const ink4  = "#a1a1aa";
const line  = "rgba(26,26,26,0.08)";

export function ErrorBoundary() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div
      className="client-portal"
      style={{ minHeight: "100vh", background: paper, display: "flex", flexDirection: "column" }}
    >
      <header
        style={{
          padding: "18px 32px",
          borderBottom: `1px solid ${line}`,
          background: `color-mix(in oklab, ${paper} 80%, transparent)`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <a
          href="https://alvarnystudios.com"
          style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: ink, color: paper,
              display: "grid", placeItems: "center",
              fontFamily: serif, fontStyle: "italic", fontSize: 18, lineHeight: 1,
              paddingBottom: 2,
            }}
          >
            A
          </div>
          <span style={{ fontFamily: serif, fontSize: 22, color: ink, letterSpacing: "-0.01em" }}>
            <span style={{ fontStyle: "italic" }}>Alvarny</span>
            {" "}
            <span style={{ fontFamily: mono, fontStyle: "normal", fontSize: 11, color: ink3, letterSpacing: "0.05em" }}>
              STUDIOS
            </span>
          </span>
        </a>
      </header>

      <div
        style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "48px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          <p
            style={{
              fontFamily: mono, fontSize: 11, color: ink3,
              textTransform: "uppercase", letterSpacing: "0.08em",
              display: "flex", alignItems: "center", gap: 8, marginBottom: 20,
            }}
          >
            <span
              style={{
                display: "inline-block", width: 6, height: 6,
                background: "#dc2626", borderRadius: "50%",
              }}
            />
            {is404 ? "Project not found" : "Something went wrong"}
          </p>

          <h1
            style={{
              fontFamily: serif, fontWeight: 400,
              fontSize: "clamp(40px, 8vw, 60px)", lineHeight: 0.96,
              letterSpacing: "-0.02em", color: ink,
              marginBottom: 24,
            }}
          >
            {is404 ? (
              <>This link<br /><em style={{ fontStyle: "italic", color: "#dc2626" }}>has moved.</em></>
            ) : (
              <>Something<br /><em style={{ fontStyle: "italic", color: "#dc2626" }}>went wrong.</em></>
            )}
          </h1>

          <p style={{ fontFamily: sans, fontSize: 15, color: ink3, lineHeight: 1.6, marginBottom: 12 }}>
            {is404
              ? "This project link is no longer active. Your designer may have updated the link or the project may have been reorganised."
              : "We hit an unexpected error loading your project."}
          </p>

          <p style={{ fontFamily: sans, fontSize: 15, color: ink3, lineHeight: 1.6, marginBottom: 36 }}>
            If you think this is a mistake, reach out to your designer and they'll get you back on track.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a
              href="/view"
              style={{
                display: "inline-block",
                background: ink, color: paper,
                borderRadius: 999, padding: "13px 24px",
                fontFamily: sans, fontSize: 14, fontWeight: 500,
                textDecoration: "none", transition: "background 200ms ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#dc2626"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = ink; }}
            >
              Enter a project code →
            </a>
            <a
              href="https://alvarnystudios.com"
              style={{
                display: "inline-block",
                background: "transparent", color: ink3,
                borderRadius: 999, padding: "13px 24px",
                fontFamily: sans, fontSize: 14,
                textDecoration: "none", border: `1px solid ${line}`,
                transition: "border-color 200ms ease, color 200ms ease",
              }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = ink; el.style.color = ink; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = line; el.style.color = ink3; }}
            >
              Visit alvarnystudios.com
            </a>
          </div>
        </div>
      </div>

      <footer
        style={{
          padding: "24px 32px",
          borderTop: `1px solid ${line}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontFamily: mono, fontSize: 11, color: ink4, letterSpacing: "0.04em",
        }}
      >
        <span>© {new Date().getFullYear()} Alvarnystudios</span>
        <a href="https://alvarnystudios.com" style={{ color: ink4, textDecoration: "none" }}>
          alvarnystudios.com ↗
        </a>
      </footer>
    </div>
  );
}

export default function ClientProjectView({ loaderData }: Route.ComponentProps) {
  const { project, projectType, brand, brief, stepsByPhase, completedAtByPhase, adminNotesByPhase, clientNotesByPhase, artifactsByPhase, phaseStatusByPhase } = loaderData;
  const displayName = project.businessName || project.name;

  return (
    <div className="client-portal flex min-h-screen flex-col" style={{ background: paper }}>
      {/* Marketing-style nav */}
      <header
        style={{
          position: "sticky", top: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px",
          background: `color-mix(in oklab, ${paper} 85%, transparent)`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${line}`,
        }}
      >
        <a
          href="https://alvarnystudios.com"
          style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: ink, color: paper,
              display: "grid", placeItems: "center",
              fontFamily: serif, fontStyle: "italic", fontSize: 18, lineHeight: 1,
              paddingBottom: 2,
            }}
          >
            A
          </div>
          <span style={{ fontFamily: serif, fontSize: 22, color: ink, letterSpacing: "-0.01em" }}>
            <span style={{ fontStyle: "italic" }}>Alvarny</span>
            {" "}
            <span style={{ fontFamily: mono, fontStyle: "normal", fontSize: 11, color: ink3, letterSpacing: "0.05em" }}>
              STUDIOS
            </span>
          </span>
        </a>

        <p style={{ fontFamily: mono, fontSize: 12, color: ink4, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {displayName}
        </p>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-4xl mx-auto w-full">
        {project.status === "proposal" && (
          <div
            style={{
              marginBottom: 24, padding: "16px 20px", borderRadius: 12,
              border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.06)",
            }}
          >
            <p style={{ fontFamily: mono, fontSize: 11, color: "#b45309", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
              Proposal
            </p>
            <p style={{ fontFamily: "'Geist', ui-sans-serif, sans-serif", fontSize: 13, color: "#92400e", lineHeight: 1.55 }}>
              Your designer has prepared this project for you. Review the phases below, fill in your brief and brand details, and upload any files. Once you're happy, let your designer know — they'll confirm and get started.
            </p>
          </div>
        )}
        <ProjectTimeline
          project={project}
          projectType={projectType}
          brand={brand}
          brief={brief}
          isAdmin={false}
          initialStepsByPhase={stepsByPhase}
          initialCompletedAtByPhase={completedAtByPhase}
          initialAdminNotesByPhase={adminNotesByPhase}
          initialClientNotesByPhase={clientNotesByPhase}
          artifactsByPhase={artifactsByPhase}
          phaseStatusByPhase={phaseStatusByPhase}
        />
      </main>

      <footer
        style={{
          padding: "20px 24px",
          borderTop: `1px solid ${line}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontFamily: mono, fontSize: 11, color: ink4, letterSpacing: "0.04em",
        }}
      >
        <span>© {new Date().getFullYear()} Alvarnystudios</span>
        <a href="https://alvarnystudios.com" style={{ color: ink4, textDecoration: "none" }}>
          alvarnystudios.com ↗
        </a>
      </footer>
    </div>
  );
}
