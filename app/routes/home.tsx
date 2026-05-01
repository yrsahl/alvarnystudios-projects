import { desc, eq } from "drizzle-orm";
import { FlaskConical, LayoutDashboard, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Form, Link, redirect } from "react-router";
import { ProjectCard } from "~/components/ProjectCard";
import { ThemeToggle } from "~/components/ThemeToggle";
import { Input } from "~/components/ui/input";
import { db } from "~/db/index.server";
import { phaseSteps, projects } from "~/db/schema";
import { PHASES } from "~/lib/phases";
import { tools } from "~/lib/tools-data";
import { cn } from "~/lib/utils";
import { destroySession, getSession, requireAdmin } from "~/lib/session.server";
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
  const formData = await request.formData();
  if (formData.get("intent") === "logout") {
    const session = await getSession(request.headers.get("Cookie"));
    return redirect("/admin-login", {
      headers: { "Set-Cookie": await destroySession(session) },
    });
  }
  return null;
}

// ── Phase distribution chart (adapted StageChart) ──────────────────────────

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
    <div className="flex items-center gap-8">
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
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="fill-foreground" style={{ fontSize: 16, fontWeight: 600 }}>
          {total}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
          total
        </text>
      </svg>
      <div className="flex flex-col gap-2.5">
        {slices.map((s) => (
          <div key={s.phase.n} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.phase.color }} />
            <span className="w-24 text-sm text-muted-foreground truncate">{s.phase.title}</span>
            <span className="text-sm font-semibold tabular-nums" style={{ color: s.phase.color }}>{s.count}</span>
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
  const [activePhase, setActivePhase] = useState<number | null>(null);

  const phaseCounts = PHASES.map((phase) => ({
    phase,
    count: projects.filter((p) => p.currentPhaseIndex === phase.n).length,
  }));

  const filtered = useMemo(() => {
    const byPhase = activePhase !== null
      ? projects.filter((p) => p.currentPhaseIndex === activePhase)
      : projects;
    if (!search.trim()) return byPhase;
    const q = search.toLowerCase();
    return byPhase.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.businessName.toLowerCase().includes(q),
    );
  }, [projects, search, activePhase]);

  function handleSidebarClick(phaseN: number | null) {
    setActivePhase(phaseN);
    const target = phaseN === null ? "overview" : `phase-${phaseN}`;
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
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
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Client Portal
          </a>
          <Link
            to="/admin/new"
            className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            New Project
          </Link>
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
              onClick={() => handleSidebarClick(null)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activePhase === null
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </button>

            <div className="my-3 px-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Phases
              </span>
            </div>

            {phaseCounts.map(({ phase, count }) => (
              <button
                key={phase.n}
                onClick={() => handleSidebarClick(activePhase === phase.n ? null : phase.n)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  activePhase === phase.n
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: phase.color }} />
                  <span className="truncate">{phase.title}</span>
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

            <div className="mb-6 inline-block rounded-lg border border-border bg-card p-5 pr-8">
              <PhaseChart phaseCounts={phaseCounts} />
            </div>

            {/* Tools grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {tools.map((tool) => (
                <a
                  key={tool.id}
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/20"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground">
                    {tool.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Projects section */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-medium text-foreground">
                {search || activePhase !== null ? "No projects found" : "No projects yet"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search || activePhase !== null
                  ? "Try adjusting your search or filter"
                  : 'Click "New Project" to get started'}
              </p>
            </div>
          ) : (
            <div id={activePhase !== null ? `phase-${activePhase}` : undefined} className="scroll-mt-20">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  {activePhase !== null ? PHASES[activePhase].title : "All Projects"}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? "project" : "projects"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((project) => (
                  <ProjectCard
                    key={project.id}
                    slug={project.slug}
                    name={project.name}
                    clientName={project.clientName}
                    businessName={project.businessName}
                    startDate={project.startDate}
                    currentPhase={PHASES[project.currentPhaseIndex]}
                    completedSteps={project.completedSteps}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
