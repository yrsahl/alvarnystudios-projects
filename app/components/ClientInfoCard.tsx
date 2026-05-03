import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { Input } from "~/components/ui/input";
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
        brief.needsBrand !== null ? { label: "Needs brand?", value: brief.needsBrand ? "Yes" : "No" } : null,
        brief.pageCount !== null ? { label: "Pages", value: String(brief.pageCount) } : null,
        brief.features ? { label: "Features", value: brief.features } : null,
        brief.timeline ? { label: "Timeline", value: brief.timeline } : null,
        brief.budget ? { label: "Budget", value: brief.budget } : null,
        brief.hasRetainer !== null
          ? { label: "Retainer", value: brief.hasRetainer ? brief.retainerAmount || "Agreed" : "No" }
          : null,
      ].filter((r): r is { label: string; value: string } => r !== null)
    : [];

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-8">
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {isAdmin ? "Active Project" : "Your Project"}
        </span>
        <span className="text-xs text-muted-foreground bg-secondary border border-border rounded-full px-3 py-1">
          {project.name}
        </span>
      </div>

      {isAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {[
            {
              label: "Client Name",
              value: clientName,
              placeholder: "Jane Smith",
              type: "text",
              onChange: (v: string) => { setClientName(v); save({ clientName: v, businessName, startDate }); },
            },
            {
              label: "Business Name",
              value: businessName,
              placeholder: "Smith Bakery",
              type: "text",
              onChange: (v: string) => { setBusinessName(v); save({ clientName, businessName: v, startDate }); },
            },
            {
              label: "Project Start",
              value: startDate,
              placeholder: "",
              type: "date",
              onChange: (v: string) => { setStartDate(v); save({ clientName, businessName, startDate: v }); },
            },
          ].map((field) => (
            <div key={field.label}>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                {field.label}
              </label>
              <Input
                type={field.type}
                value={field.value}
                placeholder={field.placeholder}
                onChange={(e) => field.onChange(e.target.value)}
                className="h-9"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {[
            { label: "Contact", value: clientName },
            { label: "Business", value: businessName },
            { label: "Started", value: startDate ? new Date(startDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "" },
          ].map(({ label, value }) => (
            <div key={label}>
              <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {label}
              </span>
              <span className="text-sm text-foreground">{value || <span className="text-muted-foreground">—</span>}</span>
            </div>
          ))}
        </div>
      )}

      {!isAdmin && briefRows.length > 0 && (
        <div className="pt-4 mb-5 border-t border-border">
          <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Project Brief
          </span>
          <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
            {briefRows.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{label}</dt>
                <dd className="text-sm text-foreground leading-relaxed">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div>
        <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
          <span>Overall Progress</span>
          {isAdmin && <span>{completedSteps} / {totalSteps} steps</span>}
        </div>
        <ProgressBar value={pct} gradient />
      </div>
    </div>
  );
}
