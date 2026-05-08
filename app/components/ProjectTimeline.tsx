import { useState } from "react";
import { getPhases, type ProjectType } from "~/lib/phases";
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
}: Props) {
  const [stepsByPhase, setStepsByPhase] = useState(initialStepsByPhase);
  const [completedAtByPhase, setCompletedAtByPhase] = useState(initialCompletedAtByPhase);

  const allPhases = getPhases(projectType);
  // Show all phases to both admin and client — phase 0 is the proposal/brief workspace
  const visiblePhases = allPhases;

  // Clients only see progress on steps they own
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

  // Auto-open the first phase that has incomplete client tasks
  const clientActivePhaseN = isAdmin
    ? null
    : visiblePhases.find((phase) =>
        phase.steps.some(
          (step, i) => step.clientOwned && !(stepsByPhase[phase.n]?.[i] ?? false),
        ),
      )?.n ?? null;

  // Derive spine gradient from phase colors
  const spineGradient = allPhases.map((p) => p.color).join(", ");

  function handleStepToggle(phaseNumber: number, stepIndex: number, checked: boolean) {
    setStepsByPhase((prev) => ({
      ...prev,
      [phaseNumber]: prev[phaseNumber].map((v, i) => (i === stepIndex ? checked : v)),
    }));
    setCompletedAtByPhase((prev) => ({
      ...prev,
      [phaseNumber]: (prev[phaseNumber] ?? []).map((v, i) =>
        i === stepIndex ? (checked ? new Date().toISOString() : null) : v
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
        brief={isAdmin ? undefined : brief}
      />

      <div className="relative">
        <div
          className="absolute left-5 top-0 bottom-0 w-px opacity-20 pointer-events-none"
          style={{ background: `linear-gradient(to bottom, ${spineGradient})` }}
        />

        {visiblePhases.map((phase) => (
          <PhaseCard
            key={phase.n}
            phase={phase}
            checkedSteps={stepsByPhase[phase.n] ?? []}
            completedAtSteps={completedAtByPhase[phase.n] ?? []}
            initialAdminNotes={initialAdminNotesByPhase[phase.n] ?? ""}
            initialClientNotes={initialClientNotesByPhase[phase.n] ?? ""}
            isAdmin={isAdmin}
            initialOpen={isAdmin ? phase.n === 0 : phase.n === clientActivePhaseN}
            artifacts={artifactsByPhase[phase.n] ?? []}
            brand={(phase.n === 0 || phase.n === 1) ? brand : undefined}
            onStepToggle={handleStepToggle}
          />
        ))}
      </div>
    </>
  );
}
