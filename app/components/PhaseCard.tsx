import { useEffect, useRef, useState } from "react";
import { useFetcher, useParams } from "react-router";
import type { Phase } from "~/lib/phases";
import { BrandValuesPanel, type BrandData } from "./BrandValuesPanel";
import { ProjectBriefPanel, type BriefData } from "./ProjectBriefPanel";
import { ProgressBar } from "./ProgressBar";
import { StepItem } from "./StepItem";

function mergeNotes(base: string, local: string, remote: string): string {
  if (remote === local) return local;
  if (remote === base) return local;
  if (local === base) return remote;
  if (local.startsWith(base) && remote.startsWith(base)) {
    const remoteNew = remote.slice(base.length).trimStart();
    return local + (local.endsWith("\n") ? "" : "\n") + remoteNew;
  }
  return local + "\n\n" + remote;
}

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

const textareaClass =
  "w-full bg-background border border-input rounded-md px-3 py-2.5 text-sm text-foreground leading-relaxed placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y transition-colors";

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
  const serverBaseRef = useRef(initialClientNotes);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  clientNotesValueRef.current = clientNotes;

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
    if (incoming === serverBaseRef.current) return;
    const merged = mergeNotes(serverBaseRef.current, clientNotesValueRef.current, incoming);
    serverBaseRef.current = incoming;
    if (merged === clientNotesValueRef.current) return;
    const el = textareaRef.current;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? 0;
    setClientNotes(merged);
    if (el === document.activeElement) {
      requestAnimationFrame(() => { el!.selectionStart = start; el!.selectionEnd = end; });
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
    <div className="grid mb-2" style={{ gridTemplateColumns: "40px 1fr", gap: "0 16px" }}>
      {/* Phase dot */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border mt-4 relative z-10 transition-all duration-300"
        style={{
          backgroundColor: `${phase.color}18`,
          borderColor: `${phase.color}40`,
          color: phase.color,
        }}
      >
        {allDone ? (
          <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
            <path d="M1.5 5.5L5 9L12.5 1.5" stroke={phase.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          phase.n
        )}
      </div>

      {/* Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-2">
        {/* Collapsible header */}
        <button onClick={() => setOpen((o) => !o)} className="w-full px-5 pt-4 pb-0 text-left cursor-pointer">
          <div className="flex items-center justify-between gap-4 pb-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground">{phase.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{phase.sub}</div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span
                className="text-xs font-semibold tabular-nums transition-colors"
                style={{ color: allDone ? "#34D399" : "var(--muted-foreground)" }}
              >
                {completedCount}/{totalCount}
              </span>
              <span
                className="text-xs font-medium px-2.5 py-0.5 rounded-full border whitespace-nowrap"
                style={{
                  backgroundColor: `${phase.color}18`,
                  borderColor: `${phase.color}40`,
                  color: phase.color,
                }}
              >
                {phase.badge}
              </span>
              <svg
                width="10" height="10" viewBox="0 0 10 10" fill="none"
                className="shrink-0 transition-transform duration-200 text-muted-foreground"
                style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
              >
                <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <ProgressBar value={pct} color={phase.color} />
        </button>

        {/* Expandable body */}
        {open && (
          <div className="border-t border-border p-5 bg-secondary/40">
            <div className={`grid gap-5 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
              {/* Steps */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
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
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Tools
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {phase.tools.map((tool) => (
                      <span
                        key={tool}
                        className="text-xs font-medium px-2.5 py-1 rounded-md bg-muted border border-border text-muted-foreground"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Key Insight
                  </h4>
                  <div
                    className="p-3 rounded-lg text-xs text-muted-foreground leading-relaxed border-l-2 bg-muted"
                    style={{ borderLeftColor: phase.color }}
                  >
                    {phase.tip}
                  </div>
                </div>
              )}
            </div>

            {phase.n === 0 && brief && <ProjectBriefPanel brief={brief} isAdmin={isAdmin} />}
            {phase.n === 1 && brand && <BrandValuesPanel brand={brand} />}

            {/* Notes */}
            <div className="mt-5 pt-5 border-t border-border space-y-4">
              {isAdmin && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Admin Notes
                  </h4>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => handleAdminNotesChange(e.target.value)}
                    placeholder="Internal notes — decisions, follow-ups, observations…"
                    rows={3}
                    className={textareaClass}
                  />
                </div>
              )}

              {phase.n !== 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Shared Notes
                  </h4>
                  <textarea
                    ref={textareaRef}
                    value={clientNotes}
                    onChange={(e) => handleClientNotesChange(e.target.value)}
                    placeholder="Agreed decisions, links, values confirmed with client…"
                    rows={3}
                    className={textareaClass}
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
