import { useEffect, useRef, useState } from "react";
import { useFetcher, useParams } from "react-router";
import type { Phase } from "~/lib/phases";
import { TOOL_URLS } from "~/lib/phases";
import { BrandValuesPanel, type BrandData } from "./BrandValuesPanel";
import { PhaseArtifacts, type Artifact } from "./PhaseArtifacts";
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
  return `${local}\n\n${remote}`;
}

interface Props {
  phase: Phase;
  checkedSteps: boolean[];
  completedAtSteps: (string | null)[];
  initialAdminNotes: string;
  initialClientNotes: string;
  isAdmin: boolean;
  initialOpen?: boolean;
  artifacts: Artifact[];
  brand?: BrandData;
  brief?: BriefData;
  onStepToggle: (phaseNumber: number, stepIndex: number, checked: boolean) => void;
}

const textareaClass =
  "w-full bg-background border border-input rounded-md px-3 py-2.5 text-sm text-foreground leading-relaxed placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y transition-colors";

export function PhaseCard({
  phase,
  checkedSteps,
  completedAtSteps,
  initialAdminNotes,
  initialClientNotes,
  isAdmin,
  initialOpen,
  artifacts,
  brand,
  brief,
  onStepToggle,
}: Props) {
  const { slug } = useParams();
  const [open, setOpen] = useState(initialOpen ?? phase.n === 0);
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

  const clientSteps = phase.steps
    .map((step, i) => ({ step, i }))
    .filter(({ step }) => step.clientOwned);
  const hasClientTasks = clientSteps.length > 0;
  const pendingClientTasks = clientSteps.filter(({ i }) => !(checkedSteps[i] ?? false));
  const hasAdminArtifacts = artifacts.some((a) => a.from === "admin");

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
        ) : isAdmin ? (
          phase.n
        ) : (
          <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
            <circle cx="3" cy="3" r="3" fill={phase.color} />
          </svg>
        )}
      </div>

      {/* Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-2">
        {/* Collapsible header */}
        <button onClick={() => setOpen((o) => !o)} className="w-full px-5 pt-4 pb-0 text-left cursor-pointer">
          <div className="flex items-center justify-between gap-4 pb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {isAdmin ? phase.title : (phase.clientTitle ?? phase.title)}
                </span>
                {/* Client: show "action needed" dot when there are pending tasks */}
                {!isAdmin && pendingClientTasks.length > 0 && (
                  <span
                    className="shrink-0 h-1.5 w-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: phase.color }}
                  />
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {isAdmin ? phase.sub : (phase.clientSub ?? phase.sub)}
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              {isAdmin && (
                <span
                  className="text-xs font-semibold tabular-nums transition-colors"
                  style={{ color: allDone ? "#34D399" : "var(--muted-foreground)" }}
                >
                  {completedCount}/{totalCount}
                </span>
              )}
              {isAdmin && (
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
              )}
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
          <div className="border-t border-border p-5 bg-secondary/40 space-y-5">

            {/* ── CLIENT VIEW ── */}
            {!isAdmin && (
              <>
                {/* Client guidance banner */}
                {phase.clientGuidance && (
                  <div
                    className="flex gap-2.5 rounded-lg px-3.5 py-3 text-sm leading-relaxed border"
                    style={{
                      backgroundColor: `${phase.color}0f`,
                      borderColor: `${phase.color}30`,
                      color: "var(--foreground)",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5" style={{ color: phase.color }}>
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span>{phase.clientGuidance}</span>
                  </div>
                )}

                {/* From your team (artifacts) */}
                {hasAdminArtifacts && (
                  <PhaseArtifacts
                    phaseNumber={phase.n}
                    artifacts={artifacts}
                    isAdmin={false}
                    color={phase.color}
                    adminHint={phase.adminArtifactHint}
                    clientHint={phase.clientArtifactHint}
                    showOnlyAdmin
                  />
                )}

                {/* Brief panel for phase 0 (if client ever sees it) */}
                {phase.n === 0 && brief && <ProjectBriefPanel brief={brief} isAdmin={false} />}

                {/* Brand panel for phase 1 — clients fill in their brand values */}
                {phase.n === 1 && brand && <BrandValuesPanel brand={brand} />}

                {/* Service phases (retainer): show what's included instead of a task list */}
                {phase.isService ? (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      What's included
                    </h4>
                    <ul className="space-y-2">
                      {phase.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: phase.color }} />
                          {step.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : hasClientTasks ? (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Your tasks
                    </h4>
                    <ul>
                      {clientSteps.map(({ step, i }) => (
                        <StepItem
                          key={i}
                          text={step.clientText ?? step.text}
                          index={i}
                          phaseNumber={phase.n}
                          checked={checkedSteps[i] ?? false}
                          completedAt={completedAtSteps[i] ?? null}
                          color={phase.color}
                          clientOwned={true}
                          isAdmin={false}
                          onToggle={(idx, val) => onStepToggle(phase.n, idx, val)}
                        />
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted border border-border text-xs text-muted-foreground">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M4.5 7.5l2 2 3-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Your team is handling this phase — no action needed from you.
                  </div>
                )}

                {/* Share with team + notes */}
                {phase.n !== 0 && (
                  <div className="space-y-4">
                    <PhaseArtifacts
                      phaseNumber={phase.n}
                      artifacts={artifacts}
                      isAdmin={false}
                      color={phase.color}
                      adminHint={phase.adminArtifactHint}
                      clientHint={phase.clientArtifactHint}
                      showOnlyClient
                    />
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Notes & questions
                      </h4>
                      <textarea
                        ref={textareaRef}
                        value={clientNotes}
                        onChange={(e) => handleClientNotesChange(e.target.value)}
                        placeholder="Leave notes or questions for your designer here…"
                        rows={3}
                        className={textareaClass}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── ADMIN VIEW ── */}
            {isAdmin && (
              <>
                <div className={`grid gap-5 ${isAdmin ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
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
                          completedAt={completedAtSteps[i] ?? null}
                          color={phase.color}
                          clientOwned={step.clientOwned ?? false}
                          isAdmin={true}
                          onToggle={(idx, val) => onStepToggle(phase.n, idx, val)}
                        />
                      ))}
                    </ul>
                  </div>

                  {/* Tools + Key Insight */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Tools
                    </h4>
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {phase.tools.map((tool) => (
                        <a
                          key={tool}
                          href={TOOL_URLS[tool]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium px-2.5 py-1 rounded-md bg-muted border border-border text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {tool}
                        </a>
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
                </div>

                {/* Special panels */}
                {phase.n === 0 && brief && <ProjectBriefPanel brief={brief} isAdmin={true} />}
                {phase.n === 1 && brand && <BrandValuesPanel brand={brand} />}

                {/* Handover callout */}
                {phase.handoverNote && (
                  <div className="flex gap-2.5 rounded-lg px-3.5 py-3 text-sm border border-amber-500/25 bg-amber-500/8">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5 text-amber-500">
                      <path d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10 4.5 11.5l.5-3.5L2.5 5.5 6 5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                    </svg>
                    <div>
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Handover</span>
                      <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">{phase.handoverNote}</p>
                    </div>
                  </div>
                )}

                {/* Artifacts */}
                <PhaseArtifacts
                  phaseNumber={phase.n}
                  artifacts={artifacts}
                  isAdmin={true}
                  color={phase.color}
                  adminHint={phase.adminArtifactHint}
                  clientHint={phase.clientArtifactHint}
                />

                {/* Admin notes + shared notes */}
                <div className="pt-5 border-t border-border space-y-4">
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
