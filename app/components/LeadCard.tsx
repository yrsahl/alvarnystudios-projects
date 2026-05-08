import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Input } from "~/components/ui/input";
import type { ProjectType } from "~/lib/phases";

export type LeadStatus = "new" | "contacted" | "lost";

export interface Lead {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  projectType: ProjectType;
  notes: string;
  status: LeadStatus;
  createdAt: string;
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new:       { label: "New",       color: "#5B8CFF", bg: "#5B8CFF18" },
  contacted: { label: "Contacted", color: "#A78BFA", bg: "#A78BFA18" },
  lost:      { label: "Lost",      color: "#6b7280", bg: "#6b728018" },
};


interface Props {
  lead: Lead;
}

export function LeadCard({ lead }: Props) {
  const fetcher = useFetcher();
  const [isEditing, setIsEditing] = useState(false);

  function handleDelete() {
    if (!confirm(`Delete lead "${lead.name}"?`)) return;
    fetcher.submit({ intent: "delete-lead", leadId: lead.id }, { method: "post" });
  }

  // Must be before any early returns — Rules of Hooks.
  // Check isEditing so we only close on our own submit (not status updates).
  useEffect(() => {
    if (
      fetcher.state === "idle" &&
      isEditing &&
      fetcher.data != null &&
      typeof fetcher.data === "object" &&
      "ok" in fetcher.data
    ) {
      setIsEditing(false);
    }
  }, [fetcher.state, fetcher.data, isEditing]);

  const isDeleting = fetcher.formData?.get("intent") === "delete-lead";
  if (isDeleting) return null;

  const status = (fetcher.formData?.get("status") as LeadStatus | undefined) ?? lead.status;
  const cfg = STATUS_CONFIG[status];
  const isLost = status === "lost";
  const isContacted = status === "contacted";

  if (isEditing) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 w-full">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Edit lead</span>
          <span
            className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border"
            style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: `${cfg.color}40` }}
          >
            {cfg.label}
          </span>
        </div>

        <fetcher.Form method="post" className="flex flex-col gap-2.5">
          <input type="hidden" name="intent" value="update-lead" />
          <input type="hidden" name="leadId" value={lead.id} />

          {[
            { name: "name",         label: "Name",     placeholder: "Jane Smith",       type: "text",  required: true,  defaultValue: lead.name },
            { name: "businessName", label: "Business", placeholder: "Smith Bakery",     type: "text",  required: false, defaultValue: lead.businessName },
            { name: "email",        label: "Email",    placeholder: "jane@example.com", type: "email", required: false, defaultValue: lead.email },
            { name: "phone",        label: "Phone",    placeholder: "+49 151 …",        type: "tel",   required: false, defaultValue: lead.phone },
          ].map((f) => (
            <div key={f.name} className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <Input
                type={f.type}
                name={f.name}
                placeholder={f.placeholder}
                defaultValue={f.defaultValue}
                required={f.required}
                disabled={fetcher.state !== "idle"}
                className="h-8 text-sm"
              />
            </div>
          ))}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
            <textarea
              name="notes"
              defaultValue={lead.notes}
              placeholder="Notes…"
              rows={2}
              disabled={fetcher.state !== "idle"}
              className="w-full bg-background border border-input rounded-md px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={fetcher.state !== "idle"}
              className="flex-1 text-xs px-2 py-1.5 rounded-md bg-foreground text-background font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              {fetcher.state !== "idle" ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs px-2 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </fetcher.Form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 w-full">
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

      {/* Contact info */}
      <div className="flex flex-wrap gap-2">
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
      {!isLost && (
        <div className="flex gap-2 pt-1 border-t border-border">
          {isContacted ? (
            /* Contacted → start a proposal project or mark lost */
            <>
              <fetcher.Form method="post" className="flex-1">
                <input type="hidden" name="intent" value="start-proposal" />
                <input type="hidden" name="leadId" value={lead.id} />
                <button
                  type="submit"
                  className="w-full text-xs px-2 py-1.5 rounded-md bg-foreground text-background font-medium hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Start Proposal
                </button>
              </fetcher.Form>
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
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs px-2 py-1.5 rounded-md text-destructive/50 hover:text-destructive transition-colors cursor-pointer"
                title="Delete lead"
              >
                🗑
              </button>
            </>
          ) : (
            /* New → advance to contacted */
            <>
              <fetcher.Form method="post" className="flex-1">
                <input type="hidden" name="intent" value="update-lead-status" />
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="status" value="contacted" />
                <button
                  type="submit"
                  className="w-full text-xs px-2 py-1.5 rounded-md bg-foreground text-background font-medium hover:opacity-90 transition-opacity cursor-pointer"
                >
                  → Contacted
                </button>
              </fetcher.Form>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-xs px-2 py-1.5 rounded-md text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
                title="Edit lead"
              >
                ✎
              </button>
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
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs px-2 py-1.5 rounded-md text-destructive/50 hover:text-destructive transition-colors cursor-pointer"
                title="Delete lead"
              >
                🗑
              </button>
            </>
          )}
        </div>
      )}

      {isLost && (
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <span />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs px-2 py-1 rounded-md text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
              title="Edit lead"
            >
              ✎
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs px-2 py-1 rounded-md text-destructive/50 hover:text-destructive transition-colors cursor-pointer"
              title="Delete lead"
            >
              🗑
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
