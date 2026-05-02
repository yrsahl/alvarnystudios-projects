import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { X } from "lucide-react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (slug: string) => void;
}

export function NewProjectModal({ open, onClose, onCreated }: NewProjectModalProps) {
  const fetcher = useFetcher<{ ok: boolean; slug: string } | { error: string }>();
  const nameRef = useRef<HTMLInputElement>(null);

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => nameRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && "ok" in fetcher.data && fetcher.data.ok) {
      onCreated(fetcher.data.slug);
      onClose();
    }
  }, [fetcher.state, fetcher.data, onCreated, onClose]);

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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={cn(
          "relative w-full max-w-md rounded-xl border border-border bg-card shadow-xl",
          "animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">New Project</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <fetcher.Form method="post" className="flex flex-col gap-4 p-5">
          <input type="hidden" name="intent" value="create" />

          {[
            { name: "name", label: "Project Name", placeholder: "Smith Bakery Website", required: true },
            { name: "clientName", label: "Client Name", placeholder: "Jane Smith", required: false },
            { name: "businessName", label: "Business Name", placeholder: "Smith Bakery", required: false },
          ].map((field, i) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              <Input
                ref={i === 0 ? nameRef : undefined}
                type="text"
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
                disabled={isSubmitting}
                className="h-10"
              />
            </div>
          ))}

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
              {isSubmitting ? "Creating…" : "Create Project"}
            </button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}
