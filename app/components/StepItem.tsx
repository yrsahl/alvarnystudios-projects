import { useFetcher } from "react-router";

interface Props {
  text: string;
  index: number;
  phaseNumber: number;
  checked: boolean;
  color: string;
  clientOwned: boolean;
  isAdmin: boolean;
  onToggle: (index: number, checked: boolean) => void;
}

export function StepItem({ text, index, phaseNumber, checked, color, clientOwned, isAdmin, onToggle }: Props) {
  const fetcher = useFetcher({});
  const canToggle = isAdmin || clientOwned;

  const pendingChecked = fetcher.formData != null ? fetcher.formData.get("completed") === "true" : checked;

  function handleClick() {
    if (!canToggle) return;
    const next = !pendingChecked;
    onToggle(index, next);
    fetcher.submit(
      {
        intent: "toggle-step",
        phaseNumber: String(phaseNumber),
        stepIndex: String(index),
        completed: String(next),
      },
      { method: "post" },
    );
  }

  return (
    <li className="py-1.5 border-b border-white/7 last:border-0">
      <button
        onClick={handleClick}
        disabled={!canToggle}
        className="flex items-start gap-2.5 w-full text-left disabled:cursor-default"
        style={{ cursor: canToggle ? "pointer" : "default" }}
      >
        {/* Checkbox */}
        <span
          className="shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all duration-150"
          style={
            pendingChecked
              ? { backgroundColor: color, borderColor: color }
              : { backgroundColor: "transparent", borderColor: "var(--color-faint)" }
          }
        >
          {pendingChecked && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5L3.5 6L8 1" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>

        <span
          className="flex-1 text-[13px] leading-relaxed transition-colors duration-150"
          style={{
            color: pendingChecked ? "var(--color-faint)" : canToggle ? "#b0afa8" : "var(--color-faint)",
            textDecoration: pendingChecked ? "line-through" : "none",
          }}
        >
          {text}
        </span>

        {/* Client-action badge */}
        {clientOwned && !isAdmin && (
          <span
            className="shrink-0 font-display text-[9px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded border mt-0.5"
            style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
          >
            Your action
          </span>
        )}
        {clientOwned && isAdmin && (
          <span className="shrink-0 font-display text-[9px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded border mt-0.5 text-muted border-white/10 bg-white/5">
            Client
          </span>
        )}
      </button>
    </li>
  );
}
