import { useState } from "react";
import { getPhases, type PhaseStatus, type ProjectType } from "~/lib/phases";
import { PhaseCard } from "./PhaseCard";
import { ClientInfoCard } from "./ClientInfoCard";
import type { BriefData } from "./ProjectBriefPanel";
import type { BrandData } from "./BrandValuesPanel";
import type { Artifact } from "./PhaseArtifacts";

interface Props {
  project: {
    name: string;
    clientName: string;
    businessName: string;
    startDate: string | null;
  };
  projectType: ProjectType;
  brand: BrandData;
  brief: BriefData;
  isAdmin: boolean;
  initialStepsByPhase: Record<number, boolean[]>;
  initialCompletedAtByPhase: Record<number, (string | null)[]>;
  initialAdminNotesByPhase: Record<number, string>;
  initialClientNotesByPhase: Record<number, string>;
  artifactsByPhase: Record<number, Artifact[]>;
  phaseStatusByPhase: Record<number, { status: PhaseStatus; revisionNote: string }>;
}

export function ProjectTimeline({
  project,
  projectType,
  brand,
  brief,
  isAdmin,
  initialStepsByPhase,
  initialCompletedAtByPhase,
  initialAdminNotesByPhase,
  initialClientNotesByPhase,
  artifactsByPhase,
  phaseStatusByPhase,
}: Props) {
  const [stepsByPhase, setStepsByPhase] = useState(initialStepsByPhase);
  const [completedAtByPhase, setCompletedAtByPhase] = useState(initialCompletedAtByPhase);

  const allPhases = getPhases(projectType);
  const visiblePhases = allPhases;

  // Clients only count steps they own
  const completedSteps = visiblePhases.reduce((sum, phase) => {
    const steps = stepsByPhase[phase.n] ?? [];
    return sum + steps.filter((done, i) =>
      done && (isAdmin || (phase.steps[i]?.clientOwned ?? false))
    ).length;
  }, 0);
  const totalSteps = visiblePhases.reduce((sum, phase) =>
    sum + (isAdmin ? phase.steps.length : phase.steps.filter((s) => s.clientOwned).length),
    0,
  );

  // Auto-open logic:
  // Admin: first in_progress or revision_requested phase, else phase 0
  // Client: first "delivered" phase (needs review), else first with pending client tasks
  function getInitialOpen(phaseN: number): boolean {
    if (isAdmin) {
      const statuses = allPhases.map((p) => ({
        n: p.n,
        status: phaseStatusByPhase[p.n]?.status ?? "not_started",
      }));
      const active = statuses.find(
        (s) => s.status === "in_progress" || s.status === "revision_requested" || s.status === "delivered",
      );
      return phaseN === (active?.n ?? 0);
    } else {
      // Client: delivered phase first (needs action), then first with pending tasks
      const deliveredPhase = allPhases.find(
        (p) => (phaseStatusByPhase[p.n]?.status ?? "not_started") === "delivered",
      );
      if (deliveredPhase) return phaseN === deliveredPhase.n;
      const activePhase = allPhases.find((phase) =>
        phase.steps.some(
          (step, i) => step.clientOwned && !(stepsByPhase[phase.n]?.[i] ?? false),
        ),
      );
      return phaseN === (activePhase?.n ?? 0);
    }
  }

  const spineGradient = allPhases.map((p) => p.color).join(", ");

  function handleStepToggle(phaseNumber: number, stepIndex: number, checked: boolean) {
    setStepsByPhase((prev) => ({
      ...prev,
      [phaseNumber]: prev[phaseNumber].map((v, i) => (i === stepIndex ? checked : v)),
    }));
    setCompletedAtByPhase((prev) => ({
      ...prev,
      [phaseNumber]: (prev[phaseNumber] ?? []).map((v, i) =>
        i === stepIndex ? (checked ? new Date().toISOString() : null) : v,
      ),
    }));
  }

  return (
    <>
      <ClientInfoCard
        project={project}
        completedSteps={completedSteps}
        totalSteps={totalSteps}
        isAdmin={isAdmin}
      />

      <div className="relative">
        <div
          className="absolute left-5 top-0 bottom-0 w-px opacity-20 pointer-events-none"
          style={{ background: `linear-gradient(to bottom, ${spineGradient})` }}
        />

        {visiblePhases.map((phase) => {
          const phaseStatusData = phaseStatusByPhase[phase.n] ?? { status: "not_started" as PhaseStatus, revisionNote: "" };
          return (
            <PhaseCard
              key={phase.n}
              phase={phase}
              checkedSteps={stepsByPhase[phase.n] ?? []}
              completedAtSteps={completedAtByPhase[phase.n] ?? []}
              initialAdminNotes={initialAdminNotesByPhase[phase.n] ?? ""}
              initialClientNotes={initialClientNotesByPhase[phase.n] ?? ""}
              isAdmin={isAdmin}
              initialOpen={getInitialOpen(phase.n)}
              artifacts={artifactsByPhase[phase.n] ?? []}
              brand={(phase.n === 0 || phase.n === 1) ? brand : undefined}
              brief={phase.n === 0 ? brief : undefined}
              phaseStatus={phaseStatusData.status}
              revisionNote={phaseStatusData.revisionNote}
              onStepToggle={handleStepToggle}
            />
          );
        })}
      </div>
    </>
  );
}
