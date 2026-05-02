import { useRef, useState } from "react";
import { useFetcher } from "react-router";

export interface BriefData {
  needsBrand: boolean | null;
  pageCount: number | null;
  features: string;
  timeline: string;
  budget: string;
  hasRetainer: boolean | null;
  retainerAmount: string;
}

interface Props {
  brief: BriefData;
  isAdmin: boolean;
}

function Toggle({
  value,
  onChange,
  color = "#5B8CFF",
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  color?: string;
}) {
  return (
    <div className="flex gap-2">
      {(["Yes", "No"] as const).map((label) => {
        const val = label === "Yes";
        const active = value === val;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(active ? null : val)}
            className="text-xs font-medium px-3 py-1.5 rounded-md border transition-all cursor-pointer"
            style={
              active
                ? { backgroundColor: `${color}18`, borderColor: `${color}50`, color }
                : undefined
            }
            {...(!active && { className: "text-xs font-medium px-3 py-1.5 rounded-md border transition-all cursor-pointer text-muted-foreground border-border hover:border-ring" })}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

const inputClass =
  "w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors";
const labelClass = "block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5";

export function ProjectBriefPanel({ brief, isAdmin }: Props) {
  const fetcher = useFetcher({});
  const [values, setValues] = useState<BriefData>(brief);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function save(next: BriefData) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetcher.submit(
        {
          intent: "update-brief",
          needsBrand: next.needsBrand === null ? "" : String(next.needsBrand),
          pageCount: next.pageCount === null ? "" : String(next.pageCount),
          features: next.features,
          timeline: next.timeline,
          budget: next.budget,
          hasRetainer: next.hasRetainer === null ? "" : String(next.hasRetainer),
          retainerAmount: next.retainerAmount,
        },
        { method: "post" },
      );
    }, 600);
  }

  function update(patch: Partial<BriefData>) {
    const next = { ...values, ...patch };
    setValues(next);
    save(next);
  }

  if (!isAdmin) {
    const rows = [
      values.needsBrand !== null ? { label: "Needs brand?", value: values.needsBrand ? "Yes" : "No" } : null,
      values.pageCount !== null ? { label: "Pages", value: String(values.pageCount) } : null,
      values.features ? { label: "Features", value: values.features } : null,
      values.timeline ? { label: "Timeline", value: values.timeline } : null,
      values.budget ? { label: "Budget", value: values.budget } : null,
      values.hasRetainer !== null
        ? { label: "Retainer", value: values.hasRetainer ? values.retainerAmount || "Agreed" : "No" }
        : null,
    ].filter((r): r is { label: string; value: string } => r !== null);

    return (
      <div className="bg-card border border-border rounded-xl p-5 mb-8">
        <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Project Brief
        </span>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brief not yet filled in.</p>
        ) : (
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
            {rows.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</dt>
                <dd className="text-sm text-foreground leading-relaxed">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    );
  }

  return (
    <div className="pt-5 mt-5 border-t border-border">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Project Brief
      </h4>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Needs brand?</label>
          <Toggle value={values.needsBrand} onChange={(v) => update({ needsBrand: v })} />
        </div>

        <div>
          <label className={labelClass}>Pages</label>
          <input
            type="number"
            min={1}
            value={values.pageCount ?? ""}
            onChange={(e) => update({ pageCount: e.target.value ? Number(e.target.value) : null })}
            placeholder="e.g. 5"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Timeline</label>
          <input
            type="text"
            value={values.timeline}
            onChange={(e) => update({ timeline: e.target.value })}
            placeholder="e.g. 6 weeks"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Budget</label>
          <input
            type="text"
            value={values.budget}
            onChange={(e) => update({ budget: e.target.value })}
            placeholder="e.g. €1,500"
            className={inputClass}
          />
        </div>

        <div className="col-span-2">
          <label className={labelClass}>Features</label>
          <textarea
            value={values.features}
            onChange={(e) => update({ features: e.target.value })}
            placeholder="e.g. Contact form, Google Maps, Blog, Booking widget"
            rows={2}
            className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y transition-colors"
          />
        </div>

        <div>
          <label className={labelClass}>Retainer agreed?</label>
          <Toggle value={values.hasRetainer} onChange={(v) => update({ hasRetainer: v })} />
        </div>

        {values.hasRetainer && (
          <div>
            <label className={labelClass}>Retainer Amount</label>
            <input
              type="text"
              value={values.retainerAmount}
              onChange={(e) => update({ retainerAmount: e.target.value })}
              placeholder="e.g. €150/mo"
              className={inputClass}
            />
          </div>
        )}
      </div>
    </div>
  );
}
