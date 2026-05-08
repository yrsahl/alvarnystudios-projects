import { eq } from "drizzle-orm";
import { ProjectTimeline } from "~/components/ProjectTimeline";
import { db } from "~/db/index.server";
import { brandValues, phaseArtifacts, phaseNotes, phaseSteps, projectBrief, projects } from "~/db/schema";
import { getPhases, type ProjectType } from "~/lib/phases";
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

  const [brand, briefRecord, stepRecords, noteRecords, artifactRecords] = await Promise.all([
    db.query.brandValues.findFirst({ where: eq(brandValues.projectId, project.id) }),
    db.query.projectBrief.findFirst({ where: eq(projectBrief.projectId, project.id) }),
    db.select().from(phaseSteps).where(eq(phaseSteps.projectId, project.id)),
    db.select().from(phaseNotes).where(eq(phaseNotes.projectId, project.id)),
    db.select().from(phaseArtifacts).where(eq(phaseArtifacts.projectId, project.id)),
  ]);

  const stepsByPhase: Record<number, boolean[]> = {};
  for (const phase of phases) {
    stepsByPhase[phase.n] = phase.steps.map((_step, i) => {
      const rec = stepRecords.find((r) => r.phaseNumber === phase.n && r.stepIndex === i);
      return rec?.completed ?? false;
    });
  }

  const clientNotesByPhase: Record<number, string> = {};
  for (const phase of phases) {
    const rec = noteRecords.find((r) => r.phaseNumber === phase.n);
    clientNotesByPhase[phase.n] = rec?.clientNotes ?? "";
  }

  const artifactsByPhase: Record<number, { id: string; from: "admin" | "client"; label: string; url: string; createdAt: string }[]> = {};
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
    projectType,
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

export default function ClientProjectView({ loaderData }: Route.ComponentProps) {
  const { project, projectType, brand, brief, stepsByPhase, adminNotesByPhase, clientNotesByPhase, artifactsByPhase } = loaderData;
  const displayName = project.businessName || project.name;

  const serif = "'Instrument Serif', 'Times New Roman', serif";
  const mono  = "'Geist Mono', ui-monospace, monospace";
  const ink   = "#1a1a1a";
  const ink3  = "#52525b";
  const ink4  = "#a1a1aa";
  const paper = "#fafaf7";
  const line  = "rgba(26,26,26,0.08)";

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
        <ProjectTimeline
          project={project}
          projectType={projectType}
          brand={brand}
          brief={brief}
          isAdmin={false}
          initialStepsByPhase={stepsByPhase}
          initialAdminNotesByPhase={adminNotesByPhase}
          initialClientNotesByPhase={clientNotesByPhase}
          artifactsByPhase={artifactsByPhase}
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
