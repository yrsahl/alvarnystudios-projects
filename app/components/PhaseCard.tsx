import { useEffect, useRef, useState } from "react";
import { useFetcher, useParams } from "react-router";

function mergeNotes(base: string, local: string, remote: string): string {
  if (remote === local) return local;
  if (remote === base) return local; // only local changed
  if (local === base) return remote; // only remote changed
  // Both appended to base — concatenate the remote addition
  if (local.startsWith(base) && remote.startsWith(base)) {
    const remoteNew = remote.slice(base.length).trimStart();
    return local + (local.endsWith("\n") ? "" : "\n") + remoteNew;
  }
  // Fallback: append remote below a separator
  return local + "\n\n" + remote;
}
import type { Phase } from "~/lib/phases";
import { BrandValuesPanel, type BrandData } from "./BrandValuesPanel";
import { ProjectBriefPanel, type BriefData } from "./ProjectBriefPanel";
import { ProgressBar } from "./ProgressBar";
import { StepItem } from "./StepItem";

interface Props {
  phase: Phase;
  checkedSteps: boolean[];
  initialAdminNotes: string;
  initialClientNotes: string;
  isAdmin: boolean;
  brand?: BrandData;
  brief?: BriefData;
  onStepToggle: (phaseNumber: number, stepIndex: number, checked: boolean) => void;
}

export function PhaseCard({ phase, checkedSteps, initialAdminNotes, initialClientNotes, isAdmin, brand, brief, onStepToggle }: Props) {
  const { slug } = useParams();
  const [open, setOpen] = useState(phase.n === 0);
  const [adminNotes, setAdminNotes] = useState(initialAdminNotes);
  const [clientNotes, setClientNotes] = useState(initialClientNotes);
  const fetcher = useFetcher({});
  const pollFetcher = useFetcher<{ clientNotes: string }>({});
  const adminDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const clientDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const clientNotesValueRef = useRef(clientNotes);
  // Tracks the last value we know the server has, used as the merge base
  const serverBaseRef = useRef(initialClientNotes);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  clientNotesValueRef.current = clientNotes;

  // Poll for shared notes every 5s
  useEffect(() => {
    if (phase.n === 0) return;
    const id = setInterval(() => {
      pollFetcher.load(`/project/${slug}/shared-notes?phase=${phase.n}`);
    }, 5000);
    return () => clearInterval(id);
  }, [slug, phase.n]);

  useEffect(() => {
    if (!pollFetcher.data) return;
    const incoming = pollFetcher.data.clientNotes;
    if (incoming === serverBaseRef.current) return; // server unchanged since last poll
    const merged = mergeNotes(serverBaseRef.current, clientNotesValueRef.current, incoming);
    serverBaseRef.current = incoming;
    if (merged === clientNotesValueRef.current) return;
    // Preserve cursor position when updating a focused textarea
    const el = textareaRef.current;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? 0;
    setClientNotes(merged);
    if (el === document.activeElement) {
      requestAnimationFrame(() => {
        el!.selectionStart = start;
        el!.selectionEnd = end;
      });
    }
  }, [pollFetcher.data]);

  const completedCount = checkedSteps.filter(Boolean).length;
  const totalCount = phase.steps.length;
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allDone = completedCount === totalCount;

  function handleAdminNotesChange(value: string) {
    setAdminNotes(value);
    clearTimeout(adminDebounceRef.current);
    adminDebounceRef.current = setTimeout(() => {
      fetcher.submit(
        { intent: "update-notes", phaseNumber: String(phase.n), noteType: "admin", notes: value },
        { method: "post" },
      );
    }, 1000);
  }

  function handleClientNotesChange(value: string) {
    setClientNotes(value);
    clearTimeout(clientDebounceRef.current);
    clientDebounceRef.current = setTimeout(() => {
      serverBaseRef.current = value;
      fetcher.submit(
        { intent: "update-notes", phaseNumber: String(phase.n), noteType: "client", notes: value },
        { method: "post" },
      );
    }, 1000);
  }

  return (
    <div className="grid mb-2" style={{ gridTemplateColumns: "40px 1fr", gap: "0 20px" }}>
      {/* Phase dot */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-display text-[13px] font-bold shrink-0 border mt-4 relative z-10 transition-all duration-300"
        style={{
          backgroundColor: `${phase.color}1a`,
          borderColor: `${phase.color}4d`,
          color: phase.color,
        }}
      >
        {allDone ? (
          <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
            <path
              d="M1.5 5.5L5 9L12.5 1.5"
              stroke={phase.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          phase.n
        )}
      </div>

      {/* Card */}
      <div className="bg-surface border border-white/7 rounded-2xl overflow-hidden mb-2">
        {/* Header — click to expand */}
        <button onClick={() => setOpen((o) => !o)} className="w-full px-5 pt-4 pb-0 text-left cursor-pointer">
          <div className="flex items-center justify-between gap-4 pb-3">
            <div className="flex-1 min-w-0">
              <div className="font-display text-[15px] font-bold text-text">{phase.title}</div>
              <div className="text-[12px] text-muted mt-0.5">{phase.sub}</div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span
                className="font-display text-[11px] font-semibold tabular-nums transition-colors"
                style={{ color: allDone ? "#34D399" : "var(--color-faint)" }}
              >
                {completedCount}/{totalCount}
              </span>
              <span
                className="font-display text-[11px] font-medium px-3 py-1 rounded-full border whitespace-nowrap"
                style={{
                  backgroundColor: `${phase.color}1a`,
                  borderColor: `${phase.color}40`,
                  color: phase.color,
                }}
              >
                {phase.badge}
              </span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                className="shrink-0 transition-transform duration-200"
                style={{
                  transform: open ? "rotate(90deg)" : "rotate(0deg)",
                  color: "var(--color-faint)",
                }}
              >
                <path
                  d="M3 2L7 5L3 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <ProgressBar value={pct} color={phase.color} />
        </button>

        {/* Expandable body */}
        {open && (
          <div className="border-t border-white/7 p-5 bg-surface2">
            <div className={`grid gap-5 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
              {/* Steps */}
              <div>
                <h4 className="font-display text-[10px] font-semibold tracking-widest uppercase text-muted mb-2.5">
                  Steps
                </h4>
                <ul>
                  {phase.steps.map((step, i) => (
                    <StepItem
                      key={i}
                      text={step.text}
                      index={i}
                      phaseNumber={phase.n}
                      checked={checkedSteps[i] ?? false}
                      color={phase.color}
                      clientOwned={step.clientOwned ?? false}
                      isAdmin={isAdmin}
                      onToggle={(idx, val) => onStepToggle(phase.n, idx, val)}
                    />
                  ))}
                </ul>
              </div>

              {/* Tools + Key Insight — admin only */}
              {isAdmin && (
                <div>
                  <h4 className="font-display text-[10px] font-semibold tracking-widest uppercase text-muted mb-2.5">
                    Tools
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {phase.tools.map((tool) => (
                      <span
                        key={tool}
                        className="font-display text-[11px] font-medium px-2.5 py-1 rounded-md bg-surface border border-white/7 text-muted"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                  <h4 className="font-display text-[10px] font-semibold tracking-widest uppercase text-muted mb-2.5">
                    Key Insight
                  </h4>
                  <div
                    className="p-3 rounded-lg text-[12px] text-muted leading-relaxed border-l-2 bg-surface"
                    style={{ borderLeftColor: phase.color }}
                  >
                    {phase.tip}
                  </div>
                </div>
              )}
            </div>

            {/* Project brief — phase 0, admin only */}
            {phase.n === 0 && brief && <ProjectBriefPanel brief={brief} isAdmin={true} />}

            {/* Brand values — phase 1 only (was phase 2, renumbered) */}
            {phase.n === 1 && brand && <BrandValuesPanel brand={brand} />}

            {/* Notes */}
            <div className="mt-4 pt-4 border-t border-white/7 space-y-3">
              {/* Admin notes — admin only */}
              {isAdmin && (
                <div>
                  <h4 className="font-display text-[10px] font-semibold tracking-widest uppercase text-muted mb-2">
                    Admin Notes
                  </h4>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => handleAdminNotesChange(e.target.value)}
                    placeholder="Internal notes — decisions, follow-ups, observations…"
                    rows={3}
                    className="w-full bg-surface border border-white/7 rounded-lg px-3 py-2.5 text-[13px] text-text leading-relaxed outline-none focus:border-white/20 placeholder:text-faint resize-y transition-colors"
                  />
                </div>
              )}

              {/* Shared notes — not shown for phase 0 since client never sees it */}
              {phase.n !== 0 && (
                <div>
                  <h4 className="font-display text-[10px] font-semibold tracking-widest uppercase text-muted mb-2">
                    Shared Notes
                  </h4>

                  <textarea
                    ref={textareaRef}
                    value={clientNotes}
                    onChange={(e) => handleClientNotesChange(e.target.value)}
                    placeholder="Agreed decisions, links, values confirmed with client…"
                    rows={3}
                    className="w-full bg-surface border border-white/7 rounded-lg px-3 py-2.5 text-[13px] text-text leading-relaxed outline-none focus:border-white/20 placeholder:text-faint resize-y transition-colors"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
