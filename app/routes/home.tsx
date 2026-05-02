import { desc, eq } from "drizzle-orm";
import { Globe, LayoutDashboard, Plus, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Form, Link, redirect } from "react-router";
import { NewProjectModal } from "~/components/NewProjectModal";
import { ProjectCard } from "~/components/ProjectCard";
import { ThemeToggle } from "~/components/ThemeToggle";
import { Input } from "~/components/ui/input";
import { db } from "~/db/index.server";
import { brandValues, phaseSteps, projects } from "~/db/schema";
import { PHASES } from "~/lib/phases";
import { destroySession, getSession, requireAdmin } from "~/lib/session.server";
import { cn } from "~/lib/utils";
import { nanoid } from "nanoid";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Studio" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);

  const [allProjects, completedStepRows] = await Promise.all([
    db.select().from(projects).orderBy(desc(projects.createdAt)),
    db
      .select({ projectId: phaseSteps.projectId, phaseNumber: phaseSteps.phaseNumber })
      .from(phaseSteps)
      .where(eq(phaseSteps.completed, true)),
  ]);

  const projectsWithPhase = allProjects.map((project) => {
    const projectSteps = completedStepRows.filter((s) => s.projectId === project.id);

    let currentPhaseIndex = 0;
    for (const phase of PHASES) {
      const doneInPhase = projectSteps.filter((s) => s.phaseNumber === phase.n).length;
      if (doneInPhase >= phase.steps.length) {
        currentPhaseIndex = Math.min(phase.n + 1, PHASES.length - 1);
      } else {
        break;
      }
    }

    return {
      id: project.id,
      slug: project.slug,
      name: project.name,
      clientName: project.clientName,
      businessName: project.businessName,
      startDate: project.startDate,
      createdAt: project.createdAt.toISOString(),
      currentPhaseIndex,
      completedSteps: projectSteps.length,
    };
  });

  return { projects: projectsWithPhase };
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
    const clientName = String(formData.get("clientName") ?? "").trim();
    const businessName = String(formData.get("businessName") ?? "").trim();
    if (!name) return { error: "Project name is required." };
    const slug = nanoid(8).toLowerCase();
    const [project] = await db
      .insert(projects)
      .values({ slug, name, clientName, businessName })
      .returning();
    await db.insert(brandValues).values({ projectId: project.id });
    return { ok: true, slug };
  }

  return null;
}

// Short labels so the chart legend never overflows
const PHASE_SHORT = ["Discovery", "Brand", "Dev", "SEO", "Launch", "Retainer"] as const;

// ── Phase distribution chart ────────────────────────────────────────────────

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

function PhaseChart({ phaseCounts }: { phaseCounts: { phase: (typeof PHASES)[0]; count: number }[] }) {
  const total = phaseCounts.reduce((s, { count }) => s + count, 0);
  const cx = 60;
  const cy = 60;
  const r = 52;

  const slices: { phase: (typeof PHASES)[0]; count: number; startAngle: number; endAngle: number }[] = [];
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
          total
        </text>
      </svg>

      {/* Two-column legend so all 6 labels fit comfortably */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {slices.map((s, i) => (
          <div key={s.phase.n} className="flex items-center gap-2" title={s.phase.title}>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.phase.color }} />
            <span className="text-sm text-muted-foreground">{PHASE_SHORT[i]}</span>
            <span className="ml-auto text-sm font-semibold tabular-nums pl-2" style={{ color: s.phase.color }}>
              {s.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard component ────────────────────────────────────────────────────

export default function Home({ loaderData }: Route.ComponentProps) {
  const { projects } = loaderData;
  const [search, setSearch] = useState("");
  const [lastClicked, setLastClicked] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newSlug, setNewSlug] = useState<string | null>(null);

  const handleCreated = useCallback((slug: string) => {
    setNewSlug(slug);
    setTimeout(() => setNewSlug(null), 2000);
  }, []);

  const phaseCounts = PHASES.map((phase) => ({
    phase,
    count: projects.filter((p) => p.currentPhaseIndex === phase.n).length,
  }));

  // Apply search across all projects, then group by phase — never hide sections entirely
  const visibleProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.businessName.toLowerCase().includes(q),
    );
  }, [projects, search]);

  const phaseGroups = useMemo(
    () =>
      PHASES.map((phase) => ({
        phase,
        projects: visibleProjects.filter((p) => p.currentPhaseIndex === phase.n),
      })).filter(({ projects }) => projects.length > 0),
    [visibleProjects],
  );

  function scrollTo(id: string, phaseN: number | null) {
    setLastClicked(phaseN);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
    <NewProjectModal
      open={showModal}
      onClose={() => setShowModal(false)}
      onCreated={handleCreated}
    />
    <div className="flex min-h-screen flex-col">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
              <span className="text-sm font-bold text-background">S</span>
            </div>
            <span className="text-sm font-semibold text-foreground">Studio</span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full bg-secondary pl-9 text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/view"
            target="_blank"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Globe className="h-3.5 w-3.5" />
            Client Portal
          </a>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            New Project
          </button>
          <ThemeToggle />
          <Form method="post">
            <input type="hidden" name="intent" value="logout" />
            <button className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer">
              Log out
            </button>
          </Form>
        </div>
      </header>

      <div className="flex flex-1">
        {/* ── Sidebar ── */}
        <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r border-border bg-sidebar p-4 overflow-y-auto">
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => scrollTo("overview", null)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                lastClicked === null
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </button>

            <div className="my-3 px-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phases</span>
            </div>

            {phaseCounts.map(({ phase, count }, i) => (
              <button
                key={phase.n}
                onClick={() => scrollTo(`phase-${phase.n}`, phase.n)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  lastClicked === phase.n
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
                  <span className="truncate">{PHASE_SHORT[i]}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{count}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 p-8 min-w-0">
          {/* Overview section */}
          <section id="overview" className="mb-10 scroll-mt-20">
            <h1 className="mb-6 text-2xl font-semibold text-foreground">Overview</h1>

            {/* Chart + stats side by side */}
            <div className="mb-8 flex flex-wrap gap-4 items-start">
              <div className="rounded-lg border border-border bg-card p-5">
                <PhaseChart phaseCounts={phaseCounts} />
              </div>

              {/* Quick-glance stats */}
              <div className="grid grid-cols-2 gap-3 flex-1 min-w-48">
                {[
                  {
                    label: "Active",
                    value: String(projects.filter((p) => p.currentPhaseIndex < 5).length),
                    sub: "in progress",
                  },

                  {
                    label: "Est. retainer",
                    value: (() => {
                      const n = projects.filter((p) => p.currentPhaseIndex === 5).length;
                      return n === 0 ? "€0" : `€${n * 100}–${n * 300}`;
                    })(),
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

          {/* Projects — one section per phase, always visible */}
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
                          <span
                            key={tool}
                            className="inline-block rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {tool}
                          </span>
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
                        clientName={project.clientName}
                        businessName={project.businessName}
                        startDate={project.startDate}
                        currentPhase={PHASES[project.currentPhaseIndex]}
                        completedSteps={project.completedSteps}
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
