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
  initialAdminNotesByPhase,
  initialClientNotesByPhase,
  artifactsByPhase,
}: Props) {
  const [stepsByPhase, setStepsByPhase] = useState(initialStepsByPhase);

  const allPhases = getPhases(projectType);
  const visiblePhases = isAdmin ? allPhases : allPhases.filter((p) => p.n > 0);

  const completedSteps = visiblePhases.reduce(
    (sum, phase) => sum + (stepsByPhase[phase.n] ?? []).filter(Boolean).length,
    0,
  );
  const totalSteps = visiblePhases.reduce((sum, phase) => sum + phase.steps.length, 0);

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
            initialAdminNotes={initialAdminNotesByPhase[phase.n] ?? ""}
            initialClientNotes={initialClientNotesByPhase[phase.n] ?? ""}
            isAdmin={isAdmin}
            initialOpen={isAdmin ? phase.n === 0 : phase.n === clientActivePhaseN}
            artifacts={artifactsByPhase[phase.n] ?? []}
            brand={phase.n === 1 ? brand : undefined}
            brief={phase.n === 0 ? brief : undefined}
            onStepToggle={handleStepToggle}
          />
        ))}
      </div>
    </>
  );
}
