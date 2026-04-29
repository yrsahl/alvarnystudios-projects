import { useState } from "react";
import { PHASES } from "~/lib/phases";
import { PhaseCard } from "./PhaseCard";
import { ClientInfoCard } from "./ClientInfoCard";
import type { BriefData } from "./ProjectBriefPanel";
import type { BrandData } from "./BrandValuesPanel";

interface Props {
  project: {
    name: string;
    clientName: string;
    businessName: string;
    startDate: string | null;
  };
  brand: BrandData;
  brief: BriefData;
  isAdmin: boolean;
  initialStepsByPhase: Record<number, boolean[]>;
  initialAdminNotesByPhase: Record<number, string>;
  initialClientNotesByPhase: Record<number, string>;
}

export function ProjectTimeline({
  project,
  brand,
  brief,
  isAdmin,
  initialStepsByPhase,
  initialAdminNotesByPhase,
  initialClientNotesByPhase,
}: Props) {
  const [stepsByPhase, setStepsByPhase] = useState(initialStepsByPhase);

  const visiblePhases = isAdmin ? PHASES : PHASES.filter((p) => p.n > 0);
  const completedSteps = visiblePhases.reduce(
    (sum, phase) => sum + (stepsByPhase[phase.n] ?? []).filter(Boolean).length,
    0,
  );
  const totalSteps = visiblePhases.reduce((sum, phase) => sum + phase.steps.length, 0);

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

      {/* Timeline */}
      <div className="relative">
        {/* Vertical spine */}
        <div
          className="absolute left-5 top-0 bottom-0 w-px opacity-30 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, #5B8CFF, #A78BFA, #34D399, #60C8B0, #FBBF24, #FB923C)",
          }}
        />

        {visiblePhases.map((phase) => (
          <PhaseCard
            key={phase.n}
            phase={phase}
            checkedSteps={stepsByPhase[phase.n] ?? []}
            initialAdminNotes={initialAdminNotesByPhase[phase.n] ?? ""}
            initialClientNotes={initialClientNotesByPhase[phase.n] ?? ""}
            isAdmin={isAdmin}
            brand={phase.n === 1 ? brand : undefined}
            brief={phase.n === 0 ? brief : undefined}
            onStepToggle={handleStepToggle}
          />
        ))}
      </div>
    </>
  );
}
