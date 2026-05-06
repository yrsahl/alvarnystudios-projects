import { useFetcher } from "react-router";
import type { ProjectType } from "~/lib/phases";
import { PROJECT_TYPE_LABELS } from "~/lib/phases";

export type LeadStatus = "new" | "contacted" | "proposal" | "converted" | "lost";

export interface Lead {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  projectType: ProjectType;
  notes: string;
  status: LeadStatus;
  convertedProjectId: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new:       { label: "New",       color: "#5B8CFF", bg: "#5B8CFF18" },
  contacted: { label: "Contacted", color: "#A78BFA", bg: "#A78BFA18" },
  proposal:  { label: "Proposal",  color: "#FBBF24", bg: "#FBBF2418" },
  converted: { label: "Converted", color: "#34D399", bg: "#34D39918" },
  lost:      { label: "Lost",      color: "#6b7280", bg: "#6b728018" },
};

const NEXT_STATUSES: Partial<Record<LeadStatus, LeadStatus>> = {
  new: "contacted",
  contacted: "proposal",
  proposal: "converted",
};

interface Props {
  lead: Lead;
}

export function LeadCard({ lead }: Props) {
  const fetcher = useFetcher();
  const isDeleting = fetcher.formData?.get("intent") === "delete-lead";
  if (isDeleting) return null;

  const status = (fetcher.formData?.get("status") as LeadStatus | undefined) ?? lead.status;
  const cfg = STATUS_CONFIG[status];
  const nextStatus = NEXT_STATUSES[status];
  const isConverted = status === "converted";
  const isLost = status === "lost";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 min-w-64 max-w-xs w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm text-foreground truncate leading-snug">{lead.name}</p>
          {lead.businessName && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{lead.businessName}</p>
          )}
        </div>
        <span
          className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border"
          style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: `${cfg.color}40` }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-2">
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-md border"
          style={{ color: "#60C8B0", backgroundColor: "#60C8B018", borderColor: "#60C8B040" }}
        >
          {PROJECT_TYPE_LABELS[lead.projectType]}
        </span>
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors truncate max-w-36"
          >
            {lead.email}
          </a>
        )}
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {lead.phone}
          </a>
        )}
      </div>

      {lead.notes && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{lead.notes}</p>
      )}

      {/* Actions */}
      {!isConverted && !isLost && (
        <div className="flex gap-2 pt-1 border-t border-border">
          {nextStatus && (
            <fetcher.Form method="post" className="flex-1">
              <input type="hidden" name="intent" value="update-lead-status" />
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="status" value={nextStatus} />
              <button
                type="submit"
                className="w-full text-xs px-2 py-1.5 rounded-md bg-foreground text-background font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                → {STATUS_CONFIG[nextStatus].label}
              </button>
            </fetcher.Form>
          )}
          {status === "proposal" && (
            <fetcher.Form method="post" className="flex-1">
              <input type="hidden" name="intent" value="convert-lead" />
              <input type="hidden" name="leadId" value={lead.id} />
              <button
                type="submit"
                className="w-full text-xs px-2 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Convert to Project
              </button>
            </fetcher.Form>
          )}
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="update-lead-status" />
            <input type="hidden" name="leadId" value={lead.id} />
            <input type="hidden" name="status" value="lost" />
            <button
              type="submit"
              className="text-xs px-2 py-1.5 rounded-md text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
              title="Mark as lost"
            >
              ✕
            </button>
          </fetcher.Form>
        </div>
      )}

      {isConverted && lead.convertedProjectId && (
        <a
          href={`/project/${lead.convertedProjectId}`}
          className="text-xs text-center text-muted-foreground hover:text-foreground transition-colors pt-1 border-t border-border"
        >
          View project →
        </a>
      )}
    </div>
  );
}
