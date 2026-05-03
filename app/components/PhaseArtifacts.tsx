import { useRef, useState } from "react";
import { useFetcher } from "react-router";

export interface Artifact {
  id: string;
  from: "admin" | "client";
  label: string;
  url: string;
  createdAt: string;
}

interface Props {
  phaseNumber: number;
  artifacts: Artifact[];
  isAdmin: boolean;
  color: string;
  adminHint: string;
  clientHint: string;
}

const inputClass =
  "flex-1 min-w-0 bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors";

function ArtifactRow({
  artifact,
  canDelete,
  color,
}: {
  artifact: Artifact;
  canDelete: boolean;
  color: string;
}) {
  const fetcher = useFetcher();
  const removing = fetcher.formData != null;

  if (removing) return null;

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border last:border-0 group/row">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 text-muted-foreground">
        {artifact.url ? (
          <path
            d="M2 6h8M7 3.5L9.5 6 7 8.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <circle cx="6" cy="6" r="2" fill="currentColor" />
        )}
      </svg>

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

function AddArtifactForm({
  phaseNumber,
  from,
  hint,
  color,
}: {
  phaseNumber: number;
  from: "admin" | "client";
  hint: string;
  color: string;
}) {
  const fetcher = useFetcher();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const labelRef = useRef<HTMLInputElement>(null);

  const submitting = fetcher.state !== "idle";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    fetcher.submit(
      { intent: "add-artifact", phaseNumber: String(phaseNumber), from, label: label.trim(), url: url.trim() },
      { method: "post" },
    );
    setLabel("");
    setUrl("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => labelRef.current?.focus(), 0); }}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 cursor-pointer"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Add
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          ref={labelRef}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={hint}
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
          disabled={!label.trim() || submitting}
          className="shrink-0 px-3 py-2 rounded-md text-xs font-medium text-white transition-opacity disabled:opacity-40 cursor-pointer disabled:cursor-default"
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

export function PhaseArtifacts({ phaseNumber, artifacts, isAdmin, color, adminHint, clientHint }: Props) {
  const adminArtifacts = artifacts.filter((a) => a.from === "admin");
  const clientArtifacts = artifacts.filter((a) => a.from === "client");

  if (isAdmin) {
    return (
      <div className="mt-5 pt-5 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Shared with client */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Shared with client
          </h4>
          {adminArtifacts.length === 0 && (
            <p className="text-xs text-muted-foreground/60 italic">Nothing shared yet.</p>
          )}
          {adminArtifacts.map((a) => (
            <ArtifactRow key={a.id} artifact={a} canDelete={true} color={color} />
          ))}
          <AddArtifactForm phaseNumber={phaseNumber} from="admin" hint={adminHint} color={color} />
        </div>

        {/* From client */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            From client
          </h4>
          {clientArtifacts.length === 0 && (
            <p className="text-xs text-muted-foreground/60 italic">Nothing submitted yet.</p>
          )}
          {clientArtifacts.map((a) => (
            <ArtifactRow key={a.id} artifact={a} canDelete={true} color={color} />
          ))}
        </div>
      </div>
    );
  }

  // Client view
  const hasAdminArtifacts = adminArtifacts.length > 0;
  const hasClientArtifacts = clientArtifacts.length > 0;

  return (
    <div className="space-y-4">
      {/* From your team */}
      {hasAdminArtifacts && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            From your team
          </h4>
          <div className="bg-muted/50 rounded-lg px-3 py-1 border border-border">
            {adminArtifacts.map((a) => (
              <ArtifactRow key={a.id} artifact={a} canDelete={false} color={color} />
            ))}
          </div>
        </div>
      )}

      {/* Share with your team */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Share with your team
        </h4>
        <div className="bg-muted/50 rounded-lg px-3 py-1 border border-border">
          {hasClientArtifacts ? (
            clientArtifacts.map((a) => (
              <ArtifactRow key={a.id} artifact={a} canDelete={true} color={color} />
            ))
          ) : (
            <p className="text-xs text-muted-foreground/60 italic py-2">Nothing shared yet.</p>
          )}
        </div>
        <AddArtifactForm phaseNumber={phaseNumber} from="client" hint={clientHint} color={color} />
      </div>
    </div>
  );
}
