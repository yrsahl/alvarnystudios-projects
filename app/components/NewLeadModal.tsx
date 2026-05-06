import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { X } from "lucide-react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import type { ProjectType } from "~/lib/phases";
import { PROJECT_TYPE_LABELS } from "~/lib/phases";

interface NewLeadModalProps {
  open: boolean;
  onClose: () => void;
}

const TYPES: ProjectType[] = ["website", "shop", "app"];

export function NewLeadModal({ open, onClose }: NewLeadModalProps) {
  const fetcher = useFetcher<{ ok: boolean } | { error: string }>();
  const nameRef = useRef<HTMLInputElement>(null);
  const [projectType, setProjectType] = useState<ProjectType>("website");
  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => nameRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && "ok" in fetcher.data && fetcher.data.ok) {
      onClose();
    }
  }, [fetcher.state, fetcher.data, onClose]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const error = fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full max-w-md rounded-xl border border-border bg-card shadow-xl",
          "animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Add Lead</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <fetcher.Form method="post" className="flex flex-col gap-4 p-5">
          <input type="hidden" name="intent" value="create-lead" />
          <input type="hidden" name="projectType" value={projectType} />

          {/* Project type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Project Type
            </label>
            <div className="flex gap-1.5">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setProjectType(t)}
                  className={cn(
                    "flex-1 py-2 text-sm rounded-md border transition-colors cursor-pointer",
                    projectType === t
                      ? "bg-foreground text-background border-foreground font-medium"
                      : "bg-background text-muted-foreground border-border hover:text-foreground",
                  )}
                >
                  {PROJECT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          {[
            { name: "name", label: "Contact Name", placeholder: "Jane Smith", required: true },
            { name: "businessName", label: "Business Name", placeholder: "Smith Bakery", required: false },
            { name: "email", label: "Email", placeholder: "jane@smithbakery.de", required: false, type: "email" },
            { name: "phone", label: "Phone", placeholder: "+49 151 …", required: false, type: "tel" },
          ].map((field, i) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              <Input
                ref={i === 0 ? nameRef : undefined}
                type={field.type ?? "text"}
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
                disabled={isSubmitting}
                className="h-10"
              />
            </div>
          ))}

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Notes
            </label>
            <textarea
              name="notes"
              placeholder="How they found you, what they need, rough budget…"
              rows={3}
              disabled={isSubmitting}
              className="w-full bg-background border border-input rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Adding…" : "Add Lead"}
            </button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}
