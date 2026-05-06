import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { Phase, ProjectType } from "~/lib/phases";
import { cn } from "~/lib/utils";

const TYPE_LABELS: Record<ProjectType, string> = {
  website: "Web",
  shop: "Shop",
  // app: "App",
};

interface ProjectCardProps {
  slug: string;
  name: string;
  clientName: string;
  businessName: string;
  startDate: string | null;
  type: ProjectType;
  currentPhase: Phase;
  completedSteps: number;
  totalSteps: number;
  siteUrl?: string | null;
  isNew?: boolean;
}

function useScreenshot(url?: string | null) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        const imgUrl = data?.data?.screenshot?.url;
        if (imgUrl) setSrc(imgUrl);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [url]);
  return src;
}

export function ProjectCard({
  slug,
  name,
  clientName,
  businessName,
  startDate,
  type,
  currentPhase,
  completedSteps,
  totalSteps,
  siteUrl,
  isNew,
}: ProjectCardProps) {
  const [shouldAnimate] = useState(() => isNew);
  const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const subtitle = [clientName, businessName].filter(Boolean).join(" · ");
  const screenshotSrc = useScreenshot(siteUrl);

  function copyClientLink() {
    navigator.clipboard.writeText(`${window.location.origin}/view/${slug}`);
  }

  return (
    <div
      className={cn(
        "group relative flex h-44 flex-col justify-between overflow-hidden rounded-xl bg-card p-4 transition-all border-2",
        shouldAnimate && "animate-in fade-in slide-in-from-top-4 duration-500",
      )}
      style={{ borderColor: `${currentPhase.color}60` }}
    >
      {screenshotSrc && (
        <>
          <img
            src={screenshotSrc}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-top opacity-0 transition-opacity duration-700"
            onLoad={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-linear-to-b from-card/50 via-card/20 to-card/90" />
        </>
      )}

      <Link to={`/project/${slug}`} className="absolute inset-0 z-0 rounded-xl" aria-label={`Open ${name}`} />

      <div className="relative z-10 flex items-start justify-between gap-2 pointer-events-none min-w-0">
        <div className="min-w-0">
          <h3 className="font-medium text-card-foreground leading-snug truncate">{name}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className="text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap"
            style={{
              color: currentPhase.color,
              borderColor: `${currentPhase.color}50`,
              backgroundColor: `${currentPhase.color}18`,
            }}
          >
            {currentPhase.title}
          </span>
          <span className="text-[10px] text-muted-foreground/70 font-medium uppercase tracking-wider">
            {TYPE_LABELS[type]}
          </span>
        </div>
      </div>

      <div className="relative z-10 pointer-events-none">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{startDate ?? ""}</span>
            <span
              className="text-xs font-semibold tabular-nums"
              style={{ color: pct === 100 ? "#34d399" : currentPhase.color }}
            >
              {completedSteps}/{totalSteps}
            </span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: currentPhase.color }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100">
          <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono tracking-wider">
            {slug}
          </code>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              copyClientLink();
            }}
            className="pointer-events-auto text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted cursor-pointer"
          >
            Copy client link
          </button>
        </div>
      </div>
    </div>
  );
}
