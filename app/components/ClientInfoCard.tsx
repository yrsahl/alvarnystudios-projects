import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { ProgressBar } from "./ProgressBar";
import type { BriefData } from "./ProjectBriefPanel";

interface Props {
  project: {
    name: string;
    clientName: string;
    businessName: string;
    startDate: string | null;
  };
  completedSteps: number;
  totalSteps: number;
  isAdmin: boolean;
  brief?: BriefData;
}

export function ClientInfoCard({ project, completedSteps, totalSteps, isAdmin, brief }: Props) {
  const fetcher = useFetcher({});
  const [clientName, setClientName] = useState(project.clientName);
  const [businessName, setBusinessName] = useState(project.businessName);
  const [startDate, setStartDate] = useState(project.startDate ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function save(fields: { clientName: string; businessName: string; startDate: string }) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetcher.submit({ intent: "update-info", ...fields }, { method: "post" });
    }, 800);
  }

  const pct = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const briefRows: { label: string; value: string }[] = brief
    ? [
        brief.needsBrand !== null
          ? { label: "Needs brand?", value: brief.needsBrand ? "Yes" : "No" }
          : null,
        brief.pageCount !== null ? { label: "Pages", value: String(brief.pageCount) } : null,
        brief.features ? { label: "Features", value: brief.features } : null,
        brief.timeline ? { label: "Timeline", value: brief.timeline } : null,
        brief.budget ? { label: "Budget", value: brief.budget } : null,
        brief.hasRetainer !== null
          ? {
              label: "Retainer",
              value: brief.hasRetainer
                ? brief.retainerAmount || "Agreed"
                : "No",
            }
          : null,
      ].filter((r): r is { label: string; value: string } => r !== null)
    : [];

  return (
    <div className="bg-surface border border-white/7 rounded-2xl p-5 mb-10">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-[10px] font-semibold tracking-[0.18em] uppercase text-muted">
          {isAdmin ? "Active Project" : "Your Project"}
        </span>
        <span className="font-display text-[11px] font-semibold text-muted bg-surface2 border border-white/7 px-3 py-1 rounded-full">
          {project.name}
        </span>
      </div>

      {/* Project info fields */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          {
            label: "Client Name",
            value: clientName,
            placeholder: "Jane Smith",
            type: "text",
            onChange: (v: string) => {
              setClientName(v);
              save({ clientName: v, businessName, startDate });
            },
          },
          {
            label: "Business Name",
            value: businessName,
            placeholder: "Smith Bakery",
            type: "text",
            onChange: (v: string) => {
              setBusinessName(v);
              save({ clientName, businessName: v, startDate });
            },
          },
          {
            label: "Project Start",
            value: startDate,
            placeholder: "",
            type: "date",
            onChange: (v: string) => {
              setStartDate(v);
              save({ clientName, businessName, startDate: v });
            },
          },
        ].map((field) => (
          <div key={field.label}>
            <label className="block font-display text-[10px] font-semibold tracking-[0.14em] uppercase text-muted mb-1.5">
              {field.label}
            </label>
            <input
              type={field.type}
              value={field.value}
              placeholder={field.placeholder}
              onChange={(e) => isAdmin && field.onChange(e.target.value)}
              readOnly={!isAdmin}
              className="w-full bg-surface2 border border-white/7 rounded-lg px-3 py-2 text-sm text-text outline-none transition-colors"
              style={{ cursor: isAdmin ? undefined : "default", opacity: isAdmin ? 1 : 0.7 }}
            />
          </div>
        ))}
      </div>

      {/* Project brief summary — client only, shown when brief has data */}
      {!isAdmin && briefRows.length > 0 && (
        <div className="pt-4 mb-5 border-t border-white/7">
          <span className="block font-display text-[10px] font-semibold tracking-[0.18em] uppercase text-muted mb-3">
            Project Brief
          </span>
          <dl className="grid grid-cols-3 gap-x-6 gap-y-3">
            {briefRows.map(({ label, value }) => (
              <div key={label}>
                <dt className="font-display text-[10px] font-semibold tracking-widest uppercase text-muted mb-0.5">
                  {label}
                </dt>
                <dd className="text-[13px] text-text leading-relaxed">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Overall progress */}
      <div>
        <div className="flex justify-between font-display text-[10px] font-semibold tracking-widest uppercase text-muted mb-1.5">
          <span>Overall Progress</span>
          <span>
            {completedSteps} / {totalSteps} steps
          </span>
        </div>
        <ProgressBar value={pct} gradient />
      </div>
    </div>
  );
}
