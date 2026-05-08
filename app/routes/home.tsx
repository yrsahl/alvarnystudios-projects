import { desc, eq } from "drizzle-orm";
import { ChevronRight, CodeIcon, LayoutDashboard, Plus, Search, ShoppingCart, UserPlus } from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Form, redirect } from "react-router";
import { LeadCard, type Lead, type LeadStatus } from "~/components/LeadCard";
import { NewLeadModal } from "~/components/NewLeadModal";
import { NewProjectModal } from "~/components/NewProjectModal";
import { ProjectCard } from "~/components/ProjectCard";
import { ThemeToggle } from "~/components/ThemeToggle";
import { Input } from "~/components/ui/input";
import { db } from "~/db/index.server";
import { brandValues, leads as leadsTable, phaseSteps, projects } from "~/db/schema";
import { getPhases, getTotalSteps, PROJECT_TYPE_LABELS, TOOL_URLS, type ProjectType } from "~/lib/phases";
import { destroySession, getSession, requireAdmin } from "~/lib/session.server";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/home";

const LEAD_STATUS_ORDER: LeadStatus[] = ["new", "contacted", "lost"];
const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  lost: "Lost",
};

export function meta(_: Route.MetaArgs) {
  return [{ title: "Projects" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);

  const [allProjects, completedStepRows, allLeads] = await Promise.all([
    db.select().from(projects).orderBy(desc(projects.createdAt)),
    db
      .select({ projectId: phaseSteps.projectId, phaseNumber: phaseSteps.phaseNumber })
      .from(phaseSteps)
      .where(eq(phaseSteps.completed, true)),
    db.select().from(leadsTable).orderBy(desc(leadsTable.createdAt)),
  ]);

  const projectsWithMeta = allProjects.map((project) => {
    const type = (project.type ?? "website") as ProjectType;
    const phases = getPhases(type);
    const projectSteps = completedStepRows.filter((s) => s.projectId === project.id);

    let currentPhaseIndex = 0;
    for (const phase of phases) {
      const doneInPhase = projectSteps.filter((s) => s.phaseNumber === phase.n).length;
      if (doneInPhase >= phase.steps.length) {
        currentPhaseIndex = Math.min(phase.n + 1, phases.length - 1);
      } else {
        break;
      }
    }

    return {
      id: project.id,
      slug: project.slug,
      name: project.name,
      type,
      status: project.status as "proposal" | "active",
      clientName: project.clientName,
      businessName: project.businessName,
      startDate: project.startDate,
      createdAt: project.createdAt.toISOString(),
      currentPhaseIndex,
      completedSteps: projectSteps.length,
      totalSteps: getTotalSteps(type),
    };
  });

  const leadsData: Lead[] = allLeads.map((l) => ({
    id: l.id,
    name: l.name,
    businessName: l.businessName,
    email: l.email,
    phone: l.phone,
    projectType: (l.projectType ?? "website") as ProjectType,
    notes: l.notes,
    status: l.status as Lead["status"],
    createdAt: l.createdAt.toISOString(),
  }));

  return { projects: projectsWithMeta, leads: leadsData };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "logout") {
    const session = await getSession(request.headers.get("Cookie"));
    return redirect("/admin-login", {
      headers: { "Set-Cookie": await destroySession(session) },
    });
  }

  if (intent === "create") {
    const name = String(formData.get("name") ?? "").trim();
    const type = String(formData.get("type") ?? "website");
    const clientName = String(formData.get("clientName") ?? "").trim();
    const businessName = String(formData.get("businessName") ?? "").trim();
    if (!name) return { error: "Project name is required." };
    const slug = nanoid(8).toLowerCase();
    const [project] = await db.insert(projects).values({ slug, name, type, clientName, businessName }).returning();
    await db.insert(brandValues).values({ projectId: project.id });
    return { ok: true, slug };
  }

  if (intent === "create-lead") {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Contact name is required." };
    await db.insert(leadsTable).values({
      name,
      businessName: String(formData.get("businessName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      projectType: String(formData.get("projectType") ?? "website"),
      notes: String(formData.get("notes") ?? "").trim(),
      source: "admin",
    });
    return { ok: true };
  }

  if (intent === "update-lead-status") {
    const leadId = String(formData.get("leadId"));
    const status = String(formData.get("status"));
    await db.update(leadsTable).set({ status, updatedAt: new Date() }).where(eq(leadsTable.id, leadId));
    return { ok: true };
  }

  if (intent === "start-proposal") {
    const leadId = String(formData.get("leadId"));
    const lead = await db.query.leads.findFirst({ where: eq(leadsTable.id, leadId) });
    if (!lead) return { error: "Lead not found." };
    const slug = nanoid(8).toLowerCase();
    const name = lead.businessName || lead.name;
    const [project] = await db
      .insert(projects)
      .values({ slug, name, type: lead.projectType, status: "proposal", clientName: lead.name, businessName: lead.businessName })
      .returning();
    await db.insert(brandValues).values({ projectId: project.id });
    await db.delete(leadsTable).where(eq(leadsTable.id, leadId));
    return redirect(`/project/${slug}`);
  }

  if (intent === "update-lead") {
    const leadId = String(formData.get("leadId"));
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Contact name is required." };
    await db
      .update(leadsTable)
      .set({
        name,
        businessName: String(formData.get("businessName") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim(),
        notes: String(formData.get("notes") ?? "").trim(),
        updatedAt: new Date(),
      })
      .where(eq(leadsTable.id, leadId));
    return { ok: true };
  }

  if (intent === "delete-lead") {
    const leadId = String(formData.get("leadId"));
    await db.delete(leadsTable).where(eq(leadsTable.id, leadId));
    return { ok: true };
  }

  return null;
}

// ── Chart ──────────────────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polarToCartesian(cx, cy, r, end);
  const e = polarToCartesian(cx, cy, r, start);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} Z`;
}

type ProjectWithMeta = Awaited<ReturnType<typeof loader>>["projects"][number];

function PhaseChart({ phases, projects }: { phases: ReturnType<typeof getPhases>; projects: ProjectWithMeta[] }) {
  const cx = 60,
    cy = 60,
    r = 52;
  const phaseCounts = phases.map((phase) => ({
    phase,
    count: projects.filter((p) => p.currentPhaseIndex === phase.n).length,
  }));
  const total = phaseCounts.reduce((s, { count }) => s + count, 0);

  const slices: { phase: (typeof phases)[0]; count: number; startAngle: number; endAngle: number }[] = [];
  let cursor = 0;
  for (const { phase, count } of phaseCounts) {
    const sweep = total > 0 ? (count / total) * 360 : 0;
    slices.push({ phase, count, startAngle: cursor, endAngle: cursor + sweep });
    cursor += sweep;
  }

  return (
    <div className="flex items-center gap-6">
      <svg width={120} height={120} className="shrink-0">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} className="fill-muted stroke-border" strokeWidth={1} />
        ) : (
          slices.map((s, i) =>
            s.count === 0 ? null : s.count === total ? (
              <circle key={i} cx={cx} cy={cy} r={r} fill={s.phase.color} />
            ) : (
              <path key={i} d={slicePath(cx, cy, r, s.startAngle, s.endAngle)} fill={s.phase.color} />
            ),
          )
        )}
        <circle cx={cx} cy={cy} r={32} className="fill-card" />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground"
          style={{ fontSize: 16, fontWeight: 600 }}
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 10 }}
        >
          projects
        </text>
      </svg>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {slices.map((s) => (
          <div key={s.phase.n} className="flex items-center gap-2 w-36" title={s.phase.title}>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.phase.color }} />
            <span className="text-sm text-muted-foreground truncate max-w-28">{s.phase.title.split(" ")[0]}</span>
            <span className="ml-auto text-sm font-semibold tabular-nums pl-2" style={{ color: s.phase.color }}>
              {s.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────

const TYPE_ORDER: ProjectType[] = ["website", "shop"];

export default function Home({ loaderData }: Route.ComponentProps) {
  const { projects, leads } = loaderData;
  const [activeType, setActiveType] = useState<ProjectType>("website");
  const [search, setSearch] = useState("");
  const [lastClicked, setLastClicked] = useState<string | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [newSlug, setNewSlug] = useState<string | null>(null);
  const [leadsOpen, setLeadsOpen] = useState(false);

  const handleCreated = useCallback((slug: string) => {
    setNewSlug(slug);
    setTimeout(() => setNewSlug(null), 2000);
  }, []);

  const phases = useMemo(() => getPhases(activeType), [activeType]);

  const filteredProjects = useMemo(() => {
    const byType = projects.filter((p) => p.type === activeType && p.status === "active");
    if (!search.trim()) return byType;
    const q = search.toLowerCase();
    return byType.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.businessName.toLowerCase().includes(q),
    );
  }, [projects, activeType, search]);

  const proposalProjects = useMemo(
    () => projects.filter((p) => p.type === activeType && p.status === "proposal"),
    [projects, activeType],
  );

  const phaseGroups = useMemo(
    () =>
      phases
        .map((phase) => ({ phase, projects: filteredProjects.filter((p) => p.currentPhaseIndex === phase.n) }))
        .filter(({ projects }) => projects.length > 0),
    [filteredProjects, phases],
  );

  const phaseCounts = useMemo(
    () =>
      phases.map((phase) => ({
        phase,
        count: projects.filter((p) => p.type === activeType && p.currentPhaseIndex === phase.n).length,
      })),
    [projects, phases, activeType],
  );

  const typeLeads = leads.filter((l) => l.projectType === activeType);
  const activeLeads = typeLeads.filter((l) => l.status !== "lost");
  const prevTypeLeadsLength = useRef(typeLeads.length);
  useEffect(() => {
    if (typeLeads.length > prevTypeLeadsLength.current) setLeadsOpen(true);
    prevTypeLeadsLength.current = typeLeads.length;
  }, [typeLeads.length]);
  const lastPhaseN = phases[phases.length - 1].n;
  const retainerCount = projects.filter((p) => p.type === activeType && p.currentPhaseIndex === lastPhaseN).length;

  const retainerRange =
    activeType === "shop"
      ? `€${retainerCount * 150}–${retainerCount * 400}`
      : `€${retainerCount * 100}–${retainerCount * 300}`;

  function scrollTo(id: string, key: string) {
    setLastClicked(key);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <NewProjectModal
        open={showProjectModal}
        projectType={activeType}
        onClose={() => setShowProjectModal(false)}
        onCreated={handleCreated}
      />
      <NewLeadModal open={showLeadModal} onClose={() => setShowLeadModal(false)} />

      <div className="flex min-h-screen flex-col">
        {/* Navbar */}
        <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-4 sm:px-6 gap-6">
          <a className="flex items-center gap-3 shrink-0" href="/">
            <div className="flex h-7 w-10 items-center justify-center rounded-md bg-foreground">
              <span className="text-sm font-bold text-background">AS</span>
            </div>
            <span className="hidden sm:inline text-sm font-semibold text-foreground">Projects</span>
          </a>

          <div className="px-8 hidden sm:flex flex-1 items-center justify-center min-w-0 gap-10">
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 w-fit">
              {TYPE_ORDER.map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer",
                    activeType === type
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {PROJECT_TYPE_LABELS[type] === "Website" && <CodeIcon className="w-3.5 h-3.5" />}
                  {PROJECT_TYPE_LABELS[type] === "Shop" && <ShoppingCart className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full bg-secondary pl-9 text-sm placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowLeadModal(true)}
              className="flex items-center gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
              title="Add lead"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Add Lead</span>
            </button>
            <button
              onClick={() => setShowProjectModal(true)}
              className="flex items-center gap-1.5 rounded-md bg-foreground px-2 sm:px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Project</span>
            </button>
            <ThemeToggle />
            <Form method="post">
              <input type="hidden" name="intent" value="logout" />
              <button className="hidden sm:block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer">
                Log out
              </button>
            </Form>
          </div>
        </header>

        <div className="flex flex-1">
          {/* Sidebar */}
          <aside className="hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r border-border bg-sidebar p-4 overflow-y-auto">
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => scrollTo("overview", "overview")}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  lastClicked === "overview"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </button>

              <button
                onClick={() => scrollTo("leads", "leads")}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  lastClicked === "leads"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Leads
                </div>
                {typeLeads.length > 0 && (
                  <span className="text-xs font-semibold tabular-nums bg-foreground text-background rounded-full px-1.5 py-0.5 min-w-5 text-center">
                    {typeLeads.length}
                  </span>
                )}
              </button>

              <div className="my-3 px-3">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phases</span>
              </div>

              {phaseCounts.map(({ phase, count }) => (
                <button
                  key={phase.n}
                  onClick={() => scrollTo(`phase-${phase.n}`, `phase-${phase.n}`)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    lastClicked === `phase-${phase.n}`
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="shrink-0 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${phase.color}25`, color: phase.color }}
                    >
                      {phase.n}
                    </span>
                    <span className="truncate">{phase.title.split(" ")[0]}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{count}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main */}
          <main className="flex-1 p-4 sm:p-8 min-w-0">
            {/* Type filter + overview */}
            <section id="overview" className="mb-10 scroll-mt-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Overview</h2>
              </div>
              <div className="mb-8 flex flex-col sm:flex-row flex-wrap gap-4 items-start">
                <div className="rounded-lg border border-border bg-card p-5">
                  <PhaseChart phases={phases} projects={projects.filter((p) => p.type === activeType)} />
                </div>

                <div className="grid grid-cols-2 gap-3 flex-1 min-w-48">
                  {[
                    {
                      label: "Active",
                      value: String(
                        projects.filter((p) => p.type === activeType && p.currentPhaseIndex < lastPhaseN).length,
                      ),
                      sub: "in progress",
                    },
                    {
                      label: retainerCount === 0 ? "Est. retainer" : "In retainer",
                      value: retainerCount === 0 ? "€0" : retainerRange,
                      sub: "per month",
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
                      <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-2xl font-semibold text-foreground tabular-nums">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Leads */}
            {typeLeads.length > 0 && (
              <section id="leads" className="mb-10 scroll-mt-20">
                <button
                  onClick={() => setLeadsOpen((o) => !o)}
                  className="flex w-full items-center justify-between mb-4 cursor-pointer group"
                >
                  <h2 className="text-lg font-semibold text-green-500">Leads 💸</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{activeLeads.length} active</span>
                    <ChevronRight
                      className="h-4 w-4 text-muted-foreground transition-transform duration-200"
                      style={{ transform: leadsOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                    />
                  </div>
                </button>

                {leadsOpen && (
                  <div className="flex flex-col gap-6">
                    {LEAD_STATUS_ORDER.map((status) => {
                      const group = typeLeads.filter((l) => l.status === status);
                      if (group.length === 0) return null;
                      return (
                        <div key={status}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              {LEAD_STATUS_LABELS[status]}
                            </span>
                            <span className="text-xs text-muted-foreground">({group.length})</span>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {group.map((lead) => (
                              <LeadCard key={lead.id} lead={lead} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Proposals */}
            {proposalProjects.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-foreground mb-4">Proposals</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {proposalProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      slug={project.slug}
                      name={project.name}
                      type={project.type}
                      status={project.status}
                      clientName={project.clientName}
                      businessName={project.businessName}
                      startDate={project.startDate}
                      currentPhase={phases[project.currentPhaseIndex]}
                      completedSteps={project.completedSteps}
                      totalSteps={project.totalSteps}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Projects by phase */}
            {phaseGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-lg font-medium text-foreground">
                  {search ? "No projects match" : "No projects yet"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search ? "Try a different search term" : 'Click "New Project" to get started'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-10">
                {phaseGroups.map(({ phase, projects: phaseProjects }) => (
                  <section key={phase.n} id={`phase-${phase.n}`} className="scroll-mt-20">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground mb-1.5">{phase.title}</h2>
                        <div className="flex flex-wrap gap-1.5">
                          {phase.tools.map((tool) => (
                            <a
                              key={tool}
                              href={TOOL_URLS[tool]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                            >
                              {tool}
                            </a>
                          ))}
                        </div>
                      </div>
                      <span className="shrink-0 text-sm text-muted-foreground pt-0.5">
                        {phaseProjects.length} {phaseProjects.length === 1 ? "project" : "projects"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {phaseProjects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          slug={project.slug}
                          name={project.name}
                          type={project.type}
                          clientName={project.clientName}
                          businessName={project.businessName}
                          startDate={project.startDate}
                          currentPhase={phases[project.currentPhaseIndex]}
                          completedSteps={project.completedSteps}
                          totalSteps={project.totalSteps}
                          isNew={project.slug === newSlug}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
