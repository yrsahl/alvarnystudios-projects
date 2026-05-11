import { useEffect, useRef, useState } from "react";
import { useFetcher, useParams } from "react-router";
import type { Phase, PhaseStatus, Step } from "~/lib/phases";
import { getPhaseGate, TOOL_URLS } from "~/lib/phases";
import { type BrandData } from "./BrandValuesPanel";
import { ProjectBriefPanel, type BriefData } from "./ProjectBriefPanel";
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

// ── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status, color }: { status: PhaseStatus; color: string }) {
  if (status === "not_started") return null;
  if (status === "in_progress") return null; // use the normal time badge

  const configs: Record<string, { label: string; bg: string; text: string }> = {
    delivered: { label: "Awaiting approval", bg: "rgba(245,158,11,0.12)", text: "#b45309" },
    approved: { label: "Approved ✓", bg: "rgba(52,211,153,0.12)", text: "#059669" },
    revision_requested: { label: "Revision requested", bg: "rgba(239,68,68,0.10)", text: "#dc2626" },
  };
  const cfg = configs[status];
  if (!cfg) return null;

  return (
    <span
      className="text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}

// ── Phase dot ──────────────────────────────────────────────────────────────

function PhaseDot({
  phase,
  status,
  isAdmin,
  allDone,
}: {
  phase: Phase;
  status: PhaseStatus;
  isAdmin: boolean;
  allDone: boolean;
}) {
  const isApproved = status === "approved";
  const isDelivered = status === "delivered";

  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border mt-4 relative z-10 transition-all duration-300"
      style={{
        backgroundColor: isApproved
          ? "rgba(52,211,153,0.15)"
          : `${phase.color}18`,
        borderColor: isApproved
          ? "rgba(52,211,153,0.4)"
          : isDelivered
          ? "rgba(245,158,11,0.5)"
          : `${phase.color}40`,
        color: isApproved ? "#059669" : phase.color,
      }}
    >
      {isApproved ? (
        <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
          <path d="M1.5 5.5L5 9L12.5 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : allDone && isAdmin ? (
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
  );
}

// ── Client task card ────────────────────────────────────────────────────────

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
              <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-sm font-medium truncate" style={{ color }}>{label}</span>
          {completedAt && <span className="text-xs text-muted-foreground shrink-0">{relativeTime(completedAt)}</span>}
        </div>
        <button
          onClick={() => toggle(false)}
          className="shrink-0 ml-3 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 cursor-pointer"
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
          <p className="text-xs mt-2 font-medium" style={{ color }}>↓ Add your feedback in the notes section below</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {taskType === "design-review" && (
          <>
            <button
              onClick={() => toggle(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-md text-white transition-opacity cursor-pointer"
              style={{ backgroundColor: color }}
            >
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Looks great — approve
            </button>
            <button
              onClick={() => {
                setRequestedChanges(true);
                setTimeout(() => setRequestedChanges(false), 4000);
                onFocusNotes();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-md border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
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
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-md border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
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
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-md border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              ✓ Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Brand reference (admin phase 1) ─────────────────────────────────────────

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

// ── Notes sync helpers ───────────────────────────────────────────────────────

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

// ── Admin deliver section ────────────────────────────────────────────────────

function AdminDeliverSection({
  phase,
  status,
  adminArtifacts,
  color,
}: {
  phase: Phase;
  status: PhaseStatus;
  adminArtifacts: Artifact[];
  color: string;
}) {
  const fetcher = useFetcher();
  const submitting = fetcher.state !== "idle";

  const gate = getPhaseGate(phase, adminArtifacts);
  const canDeliver = gate.met;

  if (status === "approved") return null;

  const isRedelivering = status === "revision_requested";
  const buttonLabel = isRedelivering ? "Re-deliver to Client" : "Deliver to Client";

  return (
    <div className="pt-5 border-t border-border">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {canDeliver ? (
            <p className="text-xs text-muted-foreground">
              {isRedelivering
                ? "Ready to re-deliver — the client will see your updates."
                : "All required items are ready. Share this phase with the client."}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add {gate.missing.map((m) => m.label).join(" and ")} above to unlock delivery.
            </p>
          )}
        </div>
        <fetcher.Form method="post" className="shrink-0">
          <input type="hidden" name="intent" value="deliver-phase" />
          <input type="hidden" name="phaseNumber" value={String(phase.n)} />
          <button
            type="submit"
            disabled={!canDeliver || submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{ backgroundColor: canDeliver ? color : "var(--muted-foreground)" }}
          >
            {submitting ? "Sending…" : (
              <>
                {buttonLabel}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3.5L11.5 7 8 10.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </fetcher.Form>
      </div>
    </div>
  );
}

// ── Client phase approval section ────────────────────────────────────────────

function ClientApprovalSection({
  phase,
  status,
  revisionNote,
}: {
  phase: Phase;
  status: PhaseStatus;
  revisionNote: string;
}) {
  const fetcher = useFetcher();
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionText, setRevisionText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      setShowRevisionForm(false);
      setRevisionText("");
    }
  }, [fetcher.state, fetcher.data]);

  if (status === "approved") {
    return (
      <div
        className="flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm"
        style={{ backgroundColor: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-emerald-500">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-medium text-emerald-700 dark:text-emerald-400">You approved this phase</span>
      </div>
    );
  }

  if (status === "revision_requested") {
    return (
      <div
        className="rounded-lg px-4 py-3.5 text-sm space-y-1"
        style={{ backgroundColor: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)" }}
      >
        <p className="font-semibold text-amber-700 dark:text-amber-400">Revision submitted — your designer is on it</p>
        {revisionNote && (
          <p className="text-xs text-amber-700/70 dark:text-amber-300/70 leading-relaxed">
            Your feedback: "{revisionNote}"
          </p>
        )}
      </div>
    );
  }

  if (status !== "delivered") return null;

  // Delivered state — the key client action moment
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ backgroundColor: `${phase.color}0c`, border: `1.5px solid ${phase.color}35` }}
    >
      <div>
        <p className="text-sm font-semibold text-foreground">
          {phase.clientDeliveredGuidance ?? "Your designer has finished this phase. Review the files below and let them know if it's good to go."}
        </p>
      </div>

      {!showRevisionForm ? (
        <div className="flex flex-wrap gap-2">
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="approve-phase" />
            <input type="hidden" name="phaseNumber" value={String(phase.n)} />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: phase.color }}
            >
              <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
                <path d="M1 5.5l3.5 3.5L12 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {submitting ? "Saving…" : "Approve this phase"}
            </button>
          </fetcher.Form>
          <button
            onClick={() => { setShowRevisionForm(true); setTimeout(() => textareaRef.current?.focus(), 0); }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Request changes
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={revisionText}
            onChange={(e) => setRevisionText(e.target.value)}
            placeholder="What should be changed? Be as specific as you like…"
            rows={3}
            className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y transition-colors"
          />
          <div className="flex gap-2">
            <fetcher.Form method="post" className="flex gap-2">
              <input type="hidden" name="intent" value="request-revision" />
              <input type="hidden" name="phaseNumber" value={String(phase.n)} />
              <input type="hidden" name="revisionNote" value={revisionText} />
              <button
                type="submit"
                disabled={!revisionText.trim() || submitting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 cursor-pointer disabled:cursor-default"
                style={{ backgroundColor: phase.color }}
              >
                {submitting ? "Sending…" : "Send feedback"}
              </button>
            </fetcher.Form>
            <button
              onClick={() => { setShowRevisionForm(false); setRevisionText(""); }}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin revision banner ─────────────────────────────────────────────────────

function AdminRevisionBanner({ phase, revisionNote }: { phase: Phase; revisionNote: string }) {
  if (!revisionNote) return null;
  return (
    <div
      className="flex items-start gap-3 rounded-lg px-4 py-3.5 text-sm"
      style={{ backgroundColor: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5 text-red-500">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <div>
        <p className="font-semibold text-red-700 dark:text-red-400">Client requested changes</p>
        <p className="text-xs text-red-700/70 dark:text-red-300/70 mt-0.5 leading-relaxed">"{revisionNote}"</p>
        <p className="text-xs text-muted-foreground mt-2">Address the feedback above, update your artifacts, and re-deliver to the client.</p>
      </div>
    </div>
  );
}

// ── Main component props ─────────────────────────────────────────────────────

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
  phaseStatus: PhaseStatus;
  revisionNote: string;
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
  brief,
  phaseStatus,
  revisionNote,
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
    if (fetcher.state !== "idle") { notesFetcherHadSubmission.current = true; return; }
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
  const adminArtifacts = artifacts.filter((a) => a.from === "admin");
  const hasAdminArtifacts = adminArtifacts.length > 0;
  const isWaiting = phase.clientUploads === false && !hasAdminArtifacts;

  const isApproved = phaseStatus === "approved";
  const isDelivered = phaseStatus === "delivered";
  const isRevision = phaseStatus === "revision_requested";
  const isInProgress = phaseStatus === "in_progress";
  const isNotStarted = phaseStatus === "not_started";

  // Client: pulse dot for "needs action"
  const clientNeedsAction = !isAdmin && (isDelivered || (!isApproved && pendingClientTasks.length > 0));

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
      <PhaseDot phase={phase} status={phaseStatus} isAdmin={isAdmin} allDone={allDone} />

      {/* Card */}
      <div
        className="border rounded-xl overflow-hidden mb-2 transition-colors"
        style={{
          backgroundColor: isApproved ? "var(--card)" : "var(--card)",
          borderColor: isDelivered && !isAdmin
            ? `${phase.color}50`
            : isRevision && isAdmin
            ? "rgba(239,68,68,0.3)"
            : "var(--border)",
        }}
      >
        {/* Collapsible header */}
        <button onClick={() => setOpen((o) => !o)} className="w-full px-5 pt-4 pb-0 text-left cursor-pointer">
          <div className="flex items-center justify-between gap-4 pb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {isAdmin ? phase.title : (phase.clientTitle ?? phase.title)}
                </span>
                {clientNeedsAction && (
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
              {/* Status badge replaces time badge when phase has lifecycle status */}
              {isAdmin && (isNotStarted || isInProgress) ? (
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
              ) : (
                <StatusBadge status={phaseStatus} color={phase.color} />
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
          <ProgressBar value={pct} color={isApproved ? "#34D399" : phase.color} />
        </button>

        {/* Expandable body */}
        {open && (
          <div className="border-t border-border p-5 bg-secondary/40 space-y-5">

            {/* ── CLIENT VIEW ── */}
            {!isAdmin && (
              <>
                {/* Phase approval / status CTA — topmost for delivered state */}
                <ClientApprovalSection
                  phase={phase}
                  status={phaseStatus}
                  revisionNote={revisionNote}
                />

                {/* Client guidance banner (shown when not delivered/approved) */}
                {!isDelivered && !isApproved && !isRevision && phase.clientGuidance && (
                  <div
                    className="flex gap-2.5 rounded-lg px-3.5 py-3 text-sm leading-relaxed border"
                    style={{ backgroundColor: `${phase.color}0f`, borderColor: `${phase.color}30`, color: "var(--foreground)" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5" style={{ color: phase.color }}>
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span>{phase.clientGuidance}</span>
                  </div>
                )}

                {/* Designer-shared artifacts */}
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
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5 text-muted-foreground">
                        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div>
                        <p className="font-medium text-foreground">Your designer is working on this</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          They'll share a preview here as soon as it's ready.
                        </p>
                      </div>
                    </div>
                  )
                )}

                {/* Phase 0: brief + conditional brand picker */}
                {phase.n === 0 && brief && (
                  <ProjectBriefPanel brief={brief} isAdmin={false} brand={brand} />
                )}

                {/* Service phase — what's included */}
                {phase.isService ? (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">What's included</h4>
                    <ul className="space-y-2">
                      {phase.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: phase.color }} />
                          {step.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : !isWaiting && hasClientTasks ? (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Your tasks</h4>
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
                  !isWaiting && phase.n > 0 && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted border border-border text-xs text-muted-foreground">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M4.5 7.5l2 2 3-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
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
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes & questions</h4>
                      <span className={`text-xs text-muted-foreground transition-opacity duration-500 ${notesSaved ? "opacity-100" : "opacity-0"}`}>
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
                {/* Revision banner — shown at top when client requested changes */}
                {isRevision && (
                  <AdminRevisionBanner phase={phase} revisionNote={revisionNote} />
                )}

                {/* Start phase CTA for not_started phases (except phase 0 which is auto-started) */}
                {isNotStarted && phase.n > 0 && (
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-border px-4 py-3.5">
                    <p className="text-sm text-muted-foreground">This phase hasn't started yet.</p>
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="start-phase" />
                      <input type="hidden" name="phaseNumber" value={String(phase.n)} />
                      <button
                        type="submit"
                        className="text-xs font-semibold px-3.5 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        Start this phase
                      </button>
                    </fetcher.Form>
                  </div>
                )}

                <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
                  {/* Steps */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Your steps</h4>
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
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client steps</h4>
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

                {/* Phase 0: editable brief + conditional brand picker */}
                {phase.n === 0 && brief && (
                  <ProjectBriefPanel brief={brief} isAdmin={true} brand={brand} />
                )}

                {/* Brand reference for phase 1 */}
                {phase.n === 1 && brand && <BrandReference brand={brand} />}

                {/* Handover note — only shown when in_progress or not started */}
                {(isInProgress || isNotStarted) && phase.handoverNote && (
                  <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm border border-amber-500/25 bg-amber-500/8">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0 mt-0.5 text-amber-500">
                      <path d="M2 7.5h11M9 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        Handover checklist
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
                          : { borderColor: "var(--amber-500/30)", backgroundColor: "var(--amber-500/10)", color: "var(--amber-700)" }
                      }
                    >
                      {copied ? "Copied ✓" : "Copy link"}
                    </button>
                  </div>
                )}

                {/* Artifacts — always shown (required slots + extras + received from client) */}
                <PhaseArtifacts
                  phaseNumber={phase.n}
                  artifacts={artifacts}
                  isAdmin={true}
                  color={phase.color}
                  adminHint={phase.adminArtifactHint}
                  clientHint={phase.clientArtifactHint}
                  requiredArtifacts={phase.requiredArtifacts}
                />

                {/* Notes */}
                <div className="pt-5 border-t border-border">
                  {phase.n === 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</h4>
                        <span className={`text-xs text-muted-foreground transition-opacity duration-500 ${notesSaved ? "opacity-100" : "opacity-0"}`}>
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
                        <span className={`ml-auto text-xs text-muted-foreground transition-opacity duration-500 ${notesSaved ? "opacity-100" : "opacity-0"}`}>
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

                {/* Deliver section — shown for in_progress, delivered (re-deliver), revision_requested */}
                {!isApproved && phase.n > 0 && (
                  <AdminDeliverSection
                    phase={phase}
                    status={phaseStatus}
                    adminArtifacts={adminArtifacts}
                    color={phase.color}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
