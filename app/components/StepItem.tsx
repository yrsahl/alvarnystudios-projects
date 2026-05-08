import { useFetcher } from "react-router";
import { cn } from "~/lib/utils";

interface Props {
  text: string;
  index: number;
  phaseNumber: number;
  checked: boolean;
  completedAt?: string | null;
  color: string;
  clientOwned: boolean;
  isAdmin: boolean;
  actionHint?: string;
  actionUrl?: string;
  onToggle: (index: number, checked: boolean) => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function StepItem({ text, index, phaseNumber, checked, completedAt, color, clientOwned, isAdmin, actionHint, actionUrl, onToggle }: Props) {
  const fetcher = useFetcher({});
  const canToggle = isAdmin || clientOwned;
  const pendingChecked = fetcher.formData != null ? fetcher.formData.get("completed") === "true" : checked;

  function handleClick() {
    if (!canToggle) return;
    const next = !pendingChecked;
    onToggle(index, next);
    fetcher.submit(
      { intent: "toggle-step", phaseNumber: String(phaseNumber), stepIndex: String(index), completed: String(next) },
      { method: "post" },
    );
  }

  return (
    <li className="py-2 border-b border-border last:border-0">
      <button
        onClick={handleClick}
        disabled={!canToggle}
        className="flex items-start gap-2.5 w-full text-left disabled:cursor-default cursor-pointer"
      >
        {/* Checkbox */}
        <span
          className="shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all duration-150"
          style={
            pendingChecked
              ? { backgroundColor: color, borderColor: color }
              : { backgroundColor: "transparent", borderColor: "var(--border)" }
          }
        >
          {pendingChecked && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>

        <span className="flex-1 min-w-0">
          <span
            className={cn(
              "block text-sm leading-relaxed transition-colors duration-150",
              pendingChecked
                ? "line-through text-muted-foreground/50"
                : canToggle
                  ? "text-foreground"
                  : "text-muted-foreground",
            )}
          >
            {text}
          </span>
          {pendingChecked && completedAt && (
            <span className="text-[10px] text-muted-foreground/50 mt-0.5 block">
              {relativeTime(completedAt)}
            </span>
          )}
        </span>

        {/* Admin-only "Client" badge */}
        {clientOwned && isAdmin && (
          <span className="shrink-0 text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded border mt-0.5 text-muted-foreground border-border bg-muted">
            Client
          </span>
        )}
      </button>

      {/* Action hint — outside the button so links are valid */}
      {!isAdmin && !pendingChecked && actionHint && (
        <p className="pl-6.5 mt-1 text-[11px] leading-snug text-muted-foreground">
          {"→ "}
          {actionUrl ? (
            <a
              href={actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {actionHint}
            </a>
          ) : (
            actionHint
          )}
        </p>
      )}
    </li>
  );
}
