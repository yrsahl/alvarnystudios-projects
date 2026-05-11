import { useEffect, useRef, useState } from "react";
import { useFetcher, useParams } from "react-router";
import type { Phase, Step } from "~/lib/phases";
import { TOOL_URLS } from "~/lib/phases";
import { BrandValuesPanel, type BrandData } from "./BrandValuesPanel";
import { PhaseArtifacts, type Artifact } from "./PhaseArtifacts";
import { ProgressBar } from "./ProgressBar";
import { StepItem } from "./StepItem";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ClientTaskCard({
  step,
  index,
  phaseNumber,
  checked,
  completedAt,
  color,
  hasPreview,
  onToggle,
  onFocusNotes,
}: {
  step: Step;
  index: number;
  phaseNumber: number;
  checked: boolean;
  completedAt: string | null;
  color: string;
  hasPreview: boolean;
  onToggle: (index: number, checked: boolean) => void;
  onFocusNotes: () => void;
}) {
  const fetcher = useFetcher({});
  const [requestedChanges, setRequestedChanges] = useState(false);
  const pendingChecked = fetcher.formData != null ? fetcher.formData.get("completed") === "true" : checked;

  function toggle(next: boolean) {
    onToggle(index, next);
    fetcher.submit(
      { intent: "toggle-step", phaseNumber: String(phaseNumber), stepIndex: String(index), completed: String(next) },
      { method: "post" },
    );
  }

  const taskType = step.clientTaskType ?? "confirm";
  const label = step.clientText ?? step.text;

  if (pendingChecked) {
    return (
      <div
        className="flex items-center justify-between rounded-lg border px-4 py-3"
        style={{ borderColor: `${color}40`, backgroundColor: `${color}0a` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="shrink-0 w-4 h-4 rounded border flex items-center justify-center"
            style={{ backgroundColor: color, borderColor: color }}
          >
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path
                d="M1 3.5L3.5 6L8 1"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-sm font-medium truncate" style={{ color }}>
            {label}
          </span>
          {completedAt && <span className="text-xs text-muted-foreground shrink-0">{relativeTime(completedAt)}</span>}
        </div>
        <button
          onClick={() => toggle(false)}
          className="shrink-0 ml-3 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        >
          Undo
        </button>
      </div>
    );
  }

  if (taskType === "design-review" && !hasPreview) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {step.actionHint && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.actionHint}</p>}
        {requestedChanges && (
          <p className="text-xs mt-2 font-medium" style={{ color }}>
            ↓ Add your feedback in the notes section below
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {taskType === "design-review" && (
          <>
            <button
              onClick={() => toggle(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-md text-white transition-opacity"
              style={{ backgroundColor: color }}
            >
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path
                  d="M1 4l2.5 2.5L9 1"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Looks great — approve
            </button>
            <button
              onClick={() => {
                setRequestedChanges(true);
                setTimeout(() => setRequestedChanges(false), 4000);
                onFocusNotes();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-md border border-border text-foreground hover:bg-muted transition-colors"
            >
              Request changes
            </button>
          </>
        )}
        {taskType === "link-action" && (
          <>
            {step.actionUrl && (
              <a
                href={step.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-md text-white"
                style={{ backgroundColor: color }}
              >
                Open →
              </a>
            )}
            <button
              onClick={() => toggle(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-md border border-border text-foreground hover:bg-muted transition-colors"
            >
              ✓ Mark as done
            </button>
          </>
        )}
        {taskType === "confirm" && (
          <>
            {step.actionUrl && (
              <a
                href={step.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-md text-white"
                style={{ backgroundColor: color }}
              >
                Open →
              </a>
            )}
            <button
              onClick={() => toggle(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-md border border-border text-foreground hover:bg-muted transition-colors"
            >
              ✓ Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Compact read-only brand reference shown to admin in phase 1
function BrandReference({ brand }: { brand: BrandData }) {
  const swatches = [
    { key: "primaryColor" as const, label: "Primary" },
    { key: "secondaryColor" as const, label: "Secondary" },
    { key: "accentColor" as const, label: "Accent" },
    { key: "bgColor" as const, label: "BG" },
    { key: "textColor" as const, label: "Text" },
  ];
  const hasFonts = brand.headingFont || brand.bodyFont;
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client Brand Values</h4>
        <span className="text-[10px] text-muted-foreground">set in phase 0</span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {swatches.map(({ key, label }) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <span
                className="w-5 h-5 rounded border border-border/60"
                style={{ background: brand[key] }}
                title={`${label}: ${brand[key]}`}
              />
              <span className="text-[9px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        {hasFonts && (
          <span className="text-[11px] text-muted-foreground border-l border-border pl-3">
            {[brand.headingFont, brand.bodyFont].filter(Boolean).join(" / ")}
          </span>
        )}
      </div>
    </div>
  );
}

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
  onStepToggle: (phaseNumber: number, stepIndex: number, checked: boolean) => void;
}

const textareaClass =
  "w-full bg-white border border-input rounded-md px-3 py-2.5 text-sm text-foreground leading-relaxed placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y transition-colors";

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
  onStepToggle,
}: Props) {
  const { slug } = useParams();
  const [open, setOpen] = useState(initialOpen ?? phase.n === 0);
  const [adminNotes, setAdminNotes] = useState(initialAdminNotes);
  const [clientNotes, setClientNotes] = useState(initialClientNotes);
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesTab, setNotesTab] = useState<"internal" | "client">("internal");
  const [copied, setCopied] = useState(false);
  const fetcher = useFetcher({});
  const pollFetcher = useFetcher<{ clientNotes: string }>({});
  const adminDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const clientDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const clientNotesValueRef = useRef(clientNotes);
  const serverBaseRef = useRef(initialClientNotes);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const notesFetcherHadSubmission = useRef(false);
  clientNotesValueRef.current = clientNotes;

  useEffect(() => {
    if (fetcher.state !== "idle") {
      notesFetcherHadSubmission.current = true;
      return;
    }
    if (!notesFetcherHadSubmission.current) return;
    notesFetcherHadSubmission.current = false;
    setNotesSaved(true);
    const t = setTimeout(() => setNotesSaved(false), 2000);
    return () => clearTimeout(t);
  }, [fetcher.state]);

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

  const clientSteps = phase.steps.map((step, i) => ({ step, i })).filter(({ step }) => step.clientOwned);
  const adminOnlySteps = phase.steps.map((step, i) => ({ step, i })).filter(({ step }) => !step.clientOwned);
  const hasClientTasks = clientSteps.length > 0;
  const pendingClientTasks = clientSteps.filter(({ i }) => !(checkedSteps[i] ?? false));
  const hasAdminArtifacts = artifacts.some((a) => a.from === "admin");
  const isWaiting = phase.clientUploads === false && !hasAdminArtifacts;

  function copyClientLink() {
    navigator.clipboard.writeText(`${window.location.origin}/view/${slug}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

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
            <path
              d="M1.5 5.5L5 9L12.5 1.5"
              stroke={phase.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                className="shrink-0 transition-transform duration-200 text-muted-foreground"
                style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
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
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0 mt-0.5"
                      style={{ color: phase.color }}
                    >
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span>{phase.clientGuidance}</span>
                  </div>
                )}

                {/* Designer-shared artifacts — show when present, or a waiting placeholder for phases that need them */}
                {hasAdminArtifacts ? (
                  <PhaseArtifacts
                    phaseNumber={phase.n}
                    artifacts={artifacts}
                    isAdmin={false}
                    color={phase.color}
                    adminHint={phase.adminArtifactHint}
                    clientHint={phase.clientArtifactHint}
                    showOnlyAdmin
                  />
                ) : (
                  phase.clientUploads === false && (
                    <div className="flex items-start gap-3 rounded-lg border border-dashed border-border px-4 py-3.5 text-sm">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="shrink-0 mt-0.5 text-muted-foreground"
                      >
                        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                        <path
                          d="M8 5v3.5l2 2"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div>
                        <p className="font-medium text-foreground">Your designer is working on this</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          They'll share a preview here as soon as it's ready. You'll be able to review and leave
                          feedback then.
                        </p>
                      </div>
                    </div>
                  )
                )}

                {/* Phase 0: initial brand input */}
                {phase.n === 0 && brand && <BrandValuesPanel brand={brand} />}

                {/* Service phases: show what's included */}
                {phase.isService ? (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      What's included
                    </h4>
                    <ul className="space-y-2">
                      {phase.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span
                            className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: phase.color }}
                          />
                          {step.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : !isWaiting && hasClientTasks ? (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Your tasks
                    </h4>
                    <div className="space-y-3">
                      {clientSteps.map(({ step, i }) => (
                        <ClientTaskCard
                          key={i}
                          step={step}
                          index={i}
                          phaseNumber={phase.n}
                          checked={checkedSteps[i] ?? false}
                          completedAt={completedAtSteps[i] ?? null}
                          color={phase.color}
                          hasPreview={hasAdminArtifacts}
                          onToggle={(idx, val) => onStepToggle(phase.n, idx, val)}
                          onFocusNotes={() => {
                            textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                            textareaRef.current?.focus();
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  !isWaiting &&
                  phase.n > 0 && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted border border-border text-xs text-muted-foreground">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                        <path
                          d="M4.5 7.5l2 2 3-4"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Your team is handling this phase — feel free to share files or questions below.
                    </div>
                  )
                )}

                {/* Upload zone + notes */}
                <div className="space-y-4">
                  {phase.clientUploads !== false && (
                    <PhaseArtifacts
                      phaseNumber={phase.n}
                      artifacts={artifacts}
                      isAdmin={false}
                      color={phase.color}
                      adminHint={phase.adminArtifactHint}
                      clientHint={phase.clientArtifactHint}
                      showOnlyClient
                    />
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Notes & questions
                      </h4>
                      <span
                        className={`text-xs text-muted-foreground transition-opacity duration-500 ${notesSaved ? "opacity-100" : "opacity-0"}`}
                      >
                        Saved ✓
                      </span>
                    </div>
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
              </>
            )}

            {/* ── ADMIN VIEW ── */}
            {isAdmin && (
              <>
                <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
                  {/* Steps — admin own + client grouped */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Your steps
                    </h4>
                    <ul>
                      {adminOnlySteps.map(({ step, i }) => (
                        <StepItem
                          key={i}
                          text={step.text}
                          index={i}
                          phaseNumber={phase.n}
                          checked={checkedSteps[i] ?? false}
                          completedAt={completedAtSteps[i] ?? null}
                          color={phase.color}
                          clientOwned={false}
                          isAdmin={true}
                          onToggle={(idx, val) => onStepToggle(phase.n, idx, val)}
                        />
                      ))}
                    </ul>

                    {clientSteps.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/60">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Client steps
                          </h4>
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={
                              pendingClientTasks.length === 0
                                ? { backgroundColor: `${phase.color}20`, color: phase.color }
                                : { backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }
                            }
                          >
                            {pendingClientTasks.length === 0
                              ? `All ${clientSteps.length} done ✓`
                              : `${clientSteps.length - pendingClientTasks.length}/${clientSteps.length} done`}
                          </span>
                        </div>
                        <ul>
                          {clientSteps.map(({ step, i }) => (
                            <StepItem
                              key={i}
                              text={step.text}
                              index={i}
                              phaseNumber={phase.n}
                              checked={checkedSteps[i] ?? false}
                              completedAt={completedAtSteps[i] ?? null}
                              color={phase.color}
                              clientOwned={false}
                              isAdmin={true}
                              onToggle={(idx, val) => onStepToggle(phase.n, idx, val)}
                            />
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Tools + Tip */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Tools</h4>
                      <div className="flex flex-wrap gap-1.5">
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
                    </div>
                    <div
                      className="p-3 rounded-lg text-xs text-muted-foreground leading-relaxed border-l-2 bg-muted"
                      style={{ borderLeftColor: phase.color }}
                    >
                      <span className="font-semibold text-foreground/60">Tip · </span>
                      {phase.tip}
                    </div>
                  </div>
                </div>

                {/* Special panels */}
                {phase.n === 1 && brand && <BrandReference brand={brand} />}

                {/* Handover callout */}
                {phase.handoverNote && (
                  <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm border border-amber-500/25 bg-amber-500/8">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="none"
                      className="shrink-0 mt-0.5 text-amber-500"
                    >
                      <path
                        d="M2 7.5h11M9 3.5l4 4-4 4"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        Next step for client
                      </span>
                      <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                        {phase.handoverNote}
                      </p>
                    </div>
                    <button
                      onClick={copyClientLink}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border transition-colors cursor-pointer"
                      style={
                        copied
                          ? { borderColor: `${phase.color}40`, backgroundColor: `${phase.color}15`, color: phase.color }
                          : {
                              borderColor: "var(--amber-500/30)",
                              backgroundColor: "var(--amber-500/10)",
                              color: "var(--amber-700)",
                            }
                      }
                    >
                      {copied ? "Copied ✓" : "Copy client link"}
                    </button>
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

                {/* Notes — single for phase 0, tabbed for phases 1+ */}
                <div className="pt-5 border-t border-border">
                  {phase.n === 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</h4>
                        <span
                          className={`text-xs text-muted-foreground transition-opacity duration-500 ${notesSaved ? "opacity-100" : "opacity-0"}`}
                        >
                          Saved ✓
                        </span>
                      </div>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => handleAdminNotesChange(e.target.value)}
                        placeholder="Internal notes — decisions, follow-ups, observations…"
                        rows={3}
                        className={textareaClass}
                      />
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 mb-3">
                        <button
                          onClick={() => setNotesTab("internal")}
                          className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer ${notesTab === "internal" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                        >
                          Internal
                        </button>
                        <button
                          onClick={() => setNotesTab("client")}
                          className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer ${notesTab === "client" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                        >
                          Client-visible
                        </button>
                        {notesTab === "client" && (
                          <span className="text-[10px] text-muted-foreground/60 ml-1">shared with client</span>
                        )}
                        <span
                          className={`ml-auto text-xs text-muted-foreground transition-opacity duration-500 ${notesSaved ? "opacity-100" : "opacity-0"}`}
                        >
                          Saved ✓
                        </span>
                      </div>
                      {notesTab === "internal" ? (
                        <textarea
                          value={adminNotes}
                          onChange={(e) => handleAdminNotesChange(e.target.value)}
                          placeholder="Internal notes — decisions, follow-ups, observations…"
                          rows={3}
                          className={textareaClass}
                        />
                      ) : (
                        <textarea
                          ref={textareaRef}
                          value={clientNotes}
                          onChange={(e) => handleClientNotesChange(e.target.value)}
                          placeholder="Agreed decisions, links, values confirmed with client…"
                          rows={3}
                          className={textareaClass}
                        />
                      )}
                    </>
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
