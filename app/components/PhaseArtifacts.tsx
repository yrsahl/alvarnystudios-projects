import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import type { ArtifactType, RequiredArtifact } from "~/lib/phases";

export interface Artifact {
  id: string;
  from: "admin" | "client";
  label: string;
  url: string;
  artifactType: ArtifactType;
  createdAt: string;
}

interface Props {
  phaseNumber: number;
  artifacts: Artifact[];
  isAdmin: boolean;
  color: string;
  adminHint: string;
  clientHint: string;
  requiredArtifacts?: RequiredArtifact[];
  showOnlyAdmin?: boolean;
  showOnlyClient?: boolean;
}

const inputClass =
  "flex-1 min-w-0 bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors";

function extractDomain(url: string): string {
  try {
    const u = url.startsWith("http") ? url : `https://${url}`;
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ArtifactTypeIcon({ type, color, size = 13 }: { type: ArtifactType; color: string; size?: number }) {
  const s = size;
  const props = { width: s, height: s, viewBox: `0 0 ${s} ${s}`, fill: "none", style: { color } };
  switch (type) {
    case "preview":
      return (
        <svg {...props}>
          <ellipse cx={s / 2} cy={s / 2} rx={s / 2 - 1} ry={s / 3} stroke="currentColor" strokeWidth="1.2" />
          <circle cx={s / 2} cy={s / 2} r={s / 6} fill="currentColor" />
        </svg>
      );
    case "repo":
      return (
        <svg {...props}>
          <circle cx="3.5" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="3.5" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="9.5" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M3.5 4.5v4M3.5 8.5C3.5 6 9.5 6 9.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "access":
      return (
        <svg {...props}>
          <circle cx="5" cy="6" r="3" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8 6h4M10 4.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "document":
      return (
        <svg {...props}>
          <rect x="2" y="1.5" width="9" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4 4.5h5M4 6.5h5M4 8.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      );
    case "recording":
      return (
        <svg {...props}>
          <circle cx={s / 2} cy={s / 2} r={s / 2 - 1} stroke="currentColor" strokeWidth="1.2" />
          <path d={`M${s / 2 - 1.5} ${s / 2 - 2.5}l4 2.5-4 2.5V${s / 2 - 2.5}z`} fill="currentColor" />
        </svg>
      );
    default: // file
      return (
        <svg {...props}>
          <path d="M3 1.5h5l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1v-9a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8 1.5V5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
  }
}

// Visual card for client view
function ArtifactCard({ artifact, canDelete, color }: { artifact: Artifact; canDelete: boolean; color: string }) {
  const fetcher = useFetcher();
  if (fetcher.formData != null) return null;

  const domain = artifact.url ? extractDomain(artifact.url) : null;
  const hasLink = Boolean(artifact.url);

  const card = (
    <div
      className="flex items-center gap-3 rounded-lg border border-border bg-background px-3.5 py-3 group/card transition-colors"
      style={hasLink ? { cursor: "pointer" } : undefined}
    >
      <div
        className="shrink-0 h-7 w-7 rounded-md flex items-center justify-center"
        style={{ backgroundColor: `${color}18` }}
      >
        <ArtifactTypeIcon type={artifact.artifactType} color={color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-snug">{artifact.label}</p>
        {domain && <p className="text-xs text-muted-foreground mt-0.5 truncate">{domain}</p>}
      </div>
      {canDelete && (
        <fetcher.Form method="post" className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <input type="hidden" name="intent" value="delete-artifact" />
          <input type="hidden" name="artifactId" value={artifact.id} />
          <button
            type="submit"
            className="opacity-0 group-hover/card:opacity-100 transition-opacity text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded"
            title="Remove"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </fetcher.Form>
      )}
    </div>
  );

  if (hasLink) {
    return (
      <a
        href={artifact.url.startsWith("http") ? artifact.url : `https://${artifact.url}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:opacity-90 transition-opacity"
      >
        {card}
      </a>
    );
  }
  return card;
}

// Compact row for admin list
function ArtifactRow({ artifact, canDelete, color }: { artifact: Artifact; canDelete: boolean; color: string }) {
  const fetcher = useFetcher();
  if (fetcher.formData != null) return null;

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border last:border-0 group/row">
      <ArtifactTypeIcon type={artifact.artifactType} color={color} size={11} />
      {artifact.url ? (
        <a
          href={artifact.url.startsWith("http") ? artifact.url : `https://${artifact.url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 text-sm truncate hover:underline"
          style={{ color }}
        >
          {artifact.label}
        </a>
      ) : (
        <span className="flex-1 min-w-0 text-sm text-foreground truncate">{artifact.label}</span>
      )}
      {canDelete && (
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="delete-artifact" />
          <input type="hidden" name="artifactId" value={artifact.id} />
          <button
            type="submit"
            className="opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded"
            title="Remove"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </fetcher.Form>
      )}
    </div>
  );
}

const TYPE_OPTIONS: { value: ArtifactType; label: string }[] = [
  { value: "preview", label: "Preview" },
  { value: "repo", label: "Repository" },
  { value: "access", label: "Access" },
  { value: "document", label: "Document" },
  { value: "recording", label: "Recording" },
  { value: "file", label: "File" },
];

// Required artifact slot — inline add form if not yet fulfilled
function RequiredArtifactSlot({
  req,
  fulfilled,
  phaseNumber,
  color,
}: {
  req: RequiredArtifact;
  fulfilled: Artifact | undefined;
  phaseNumber: number;
  color: string;
}) {
  const fetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);
  const submitting = fetcher.state !== "idle";
  const removing = deleteFetcher.formData != null;

  const isFulfilled = fulfilled && !removing;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      setUrl("");
      setOpen(false);
    }
  }, [fetcher.state, fetcher.data]);

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!url.trim()) return;
    fetcher.submit(
      {
        intent: "add-artifact",
        phaseNumber: String(phaseNumber),
        from: "admin",
        label: req.label,
        url: url.trim(),
        artifactType: req.type,
      },
      { method: "post" },
    );
  }

  return (
    <div
      className="rounded-lg border px-3.5 py-3 transition-colors"
      style={
        isFulfilled
          ? { borderColor: `${color}40`, backgroundColor: `${color}08` }
          : { borderColor: "var(--border)", backgroundColor: "var(--background)" }
      }
    >
      <div className="flex items-center gap-2.5">
        <div
          className="shrink-0 h-6 w-6 rounded-md flex items-center justify-center"
          style={{ backgroundColor: isFulfilled ? `${color}20` : "var(--muted)" }}
        >
          <ArtifactTypeIcon type={req.type} color={isFulfilled ? color : "var(--muted-foreground)"} size={11} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">{req.label}</span>
            {!req.required && (
              <span className="text-[10px] text-muted-foreground/60 border border-border rounded px-1">optional</span>
            )}
          </div>
          {isFulfilled ? (
            <a
              href={fulfilled.url.startsWith("http") ? fulfilled.url : `https://${fulfilled.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs truncate hover:underline"
              style={{ color }}
            >
              {extractDomain(fulfilled.url) || fulfilled.url}
            </a>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">{req.prompt}</p>
          )}
        </div>
        {isFulfilled ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold" style={{ color }}>✓</span>
            <deleteFetcher.Form method="post">
              <input type="hidden" name="intent" value="delete-artifact" />
              <input type="hidden" name="artifactId" value={fulfilled.id} />
              <button
                type="submit"
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
                title="Remove"
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </deleteFetcher.Form>
          </div>
        ) : (
          <button
            onClick={() => { setOpen((o) => !o); setTimeout(() => urlRef.current?.focus(), 0); }}
            className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            + Add
          </button>
        )}
      </div>

      {open && !isFulfilled && (
        <form onSubmit={handleSubmit} className="mt-2.5 flex gap-2">
          <input
            ref={urlRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={req.hint}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={!url.trim() || submitting}
            className="shrink-0 px-3 py-2 rounded-md text-xs font-semibold text-white disabled:opacity-40 cursor-pointer disabled:cursor-default transition-opacity"
            style={{ backgroundColor: color }}
          >
            {submitting ? "…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setUrl(""); }}
            className="shrink-0 px-2.5 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            ✕
          </button>
        </form>
      )}
    </div>
  );
}

// Admin generic add form (for extra artifacts beyond required)
function AdminAddForm({ phaseNumber, hint, color }: {
  phaseNumber: number;
  hint: string;
  color: string;
}) {
  const fetcher = useFetcher();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<ArtifactType>("file");
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const labelRef = useRef<HTMLInputElement>(null);
  const hadSubmission = useRef(false);

  useEffect(() => {
    if (fetcher.state !== "idle") { hadSubmission.current = true; return; }
    if (!hadSubmission.current) return;
    hadSubmission.current = false;
    setShared(true);
    const t = setTimeout(() => setShared(false), 3000);
    return () => clearTimeout(t);
  }, [fetcher.state]);

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!label.trim()) return;
    fetcher.submit(
      { intent: "add-artifact", phaseNumber: String(phaseNumber), from: "admin", label: label.trim(), url: url.trim(), artifactType: type },
      { method: "post" },
    );
    setLabel(""); setUrl(""); setOpen(false);
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={() => { setOpen(true); setTimeout(() => labelRef.current?.focus(), 0); }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Add another
        </button>
        <span className="text-xs transition-opacity duration-500" style={{ color, opacity: shared ? 1 : 0 }}>
          Shared ✓
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2">
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ArtifactType)}
          className="shrink-0 bg-background border border-input rounded-md px-2 py-2 text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          ref={labelRef}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={hint.replace(/^e\.g\.\s*/i, "")}
          className={inputClass}
          maxLength={120}
        />
      </div>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Link (optional)"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={!label.trim() || fetcher.state !== "idle"}
          className="shrink-0 px-3 py-2 rounded-md text-xs font-medium text-white disabled:opacity-40 cursor-pointer disabled:cursor-default"
          style={{ backgroundColor: color }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setLabel(""); setUrl(""); }}
          className="shrink-0 px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// Client upload zone
function ClientUploadZone({ phaseNumber, artifacts, hint, color }: {
  phaseNumber: number;
  artifacts: Artifact[];
  hint: string;
  color: string;
}) {
  const fetcher = useFetcher();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);
  const submitting = fetcher.state !== "idle";
  const hasItems = artifacts.length > 0;
  const hintText = hint.replace(/^e\.g\.\s*/i, "");

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!label.trim()) return;
    fetcher.submit(
      { intent: "add-artifact", phaseNumber: String(phaseNumber), from: "client", label: label.trim(), url: url.trim(), artifactType: "file" },
      { method: "post" },
    );
    setLabel(""); setUrl("");
  }

  return (
    <div className="space-y-2">
      {hasItems && (
        <div className="flex flex-col gap-2">
          {artifacts.map((a) => (
            <ArtifactCard key={a.id} artifact={a} canDelete color={color} />
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div
          className="rounded-xl border-2 border-dashed transition-colors p-4"
          style={{
            borderColor: focused ? `${color}60` : "var(--border)",
            backgroundColor: focused ? `${color}05` : "transparent",
          }}
        >
          {!hasItems && (
            <div className="flex flex-col items-center text-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color }}>
                  <path d="M8 11V4M5 7l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 13h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Share files or links</p>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">{hintText}</p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={hasItems ? "What else are you sharing?" : "What are you sharing? (e.g. My logo)"}
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
              maxLength={120}
            />
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Google Drive, Dropbox, or other link (optional)"
                className="flex-1 bg-background border border-input rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
              />
              <button
                type="submit"
                disabled={!label.trim() || submitting}
                className="shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-40 cursor-pointer disabled:cursor-default"
                style={{ backgroundColor: color }}
              >
                {submitting ? "…" : "Share"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export function PhaseArtifacts({
  phaseNumber,
  artifacts,
  isAdmin,
  color,
  adminHint,
  clientHint,
  requiredArtifacts,
  showOnlyAdmin,
  showOnlyClient,
}: Props) {
  const adminArtifacts = artifacts.filter((a) => a.from === "admin");
  const clientArtifacts = artifacts.filter((a) => a.from === "client");

  // ── Admin view ──────────────────────────────────────────────────────────
  if (isAdmin) {
    // Required artifact types that are NOT covered by a requiredArtifacts slot
    const requiredTypes = new Set((requiredArtifacts ?? []).map((r) => r.type));
    const extraAdminArtifacts = adminArtifacts.filter((a) => !requiredTypes.has(a.artifactType));

    return (
      <div className="pt-5 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Share with client */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Share with client
          </h4>

          {/* Required artifact slots */}
          {requiredArtifacts && requiredArtifacts.length > 0 && (
            <div className="flex flex-col gap-2 mb-2">
              {requiredArtifacts.map((req, i) => {
                const fulfilled = adminArtifacts.find((a) => a.artifactType === req.type);
                return (
                  <RequiredArtifactSlot
                    key={i}
                    req={req}
                    fulfilled={fulfilled}
                    phaseNumber={phaseNumber}
                    color={color}
                  />
                );
              })}
            </div>
          )}

          {/* Extra non-required artifacts */}
          {extraAdminArtifacts.length > 0 && (
            <div className="mb-1">
              {extraAdminArtifacts.map((a) => (
                <ArtifactRow key={a.id} artifact={a} canDelete color={color} />
              ))}
            </div>
          )}

          <AdminAddForm phaseNumber={phaseNumber} hint={adminHint} color={color} />
        </div>

        {/* Received from client */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Received from client
          </h4>
          {clientArtifacts.length === 0 && (
            <p className="text-xs text-muted-foreground/60 italic">Nothing submitted yet.</p>
          )}
          {clientArtifacts.map((a) => (
            <ArtifactRow key={a.id} artifact={a} canDelete color={color} />
          ))}
        </div>
      </div>
    );
  }

  // ── Client view: "From your designer" only ────────────────────────────
  if (showOnlyAdmin) {
    if (adminArtifacts.length === 0) return null;
    return (
      <div>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          From your designer
        </h4>
        <div className="flex flex-col gap-2">
          {adminArtifacts.map((a) => (
            <ArtifactCard key={a.id} artifact={a} canDelete={false} color={color} />
          ))}
        </div>
      </div>
    );
  }

  // ── Client view: upload zone only ────────────────────────────────────
  if (showOnlyClient) {
    return (
      <ClientUploadZone phaseNumber={phaseNumber} artifacts={clientArtifacts} hint={clientHint} color={color} />
    );
  }

  // ── Client view: full ────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {adminArtifacts.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            From your designer
          </h4>
          <div className="flex flex-col gap-2">
            {adminArtifacts.map((a) => (
              <ArtifactCard key={a.id} artifact={a} canDelete={false} color={color} />
            ))}
          </div>
        </div>
      )}
      <ClientUploadZone phaseNumber={phaseNumber} artifacts={clientArtifacts} hint={clientHint} color={color} />
    </div>
  );
}
