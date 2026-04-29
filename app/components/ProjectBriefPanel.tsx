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
            className="font-display text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
            style={
              active
                ? { backgroundColor: `${color}20`, borderColor: `${color}60`, color }
                : { backgroundColor: "transparent", borderColor: "var(--color-faint)", color: "var(--color-muted)" }
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

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
    const rows: { label: string; value: string | null }[] = [
      {
        label: "Needs brand?",
        value: values.needsBrand === null ? null : values.needsBrand ? "Yes" : "No",
      },
      {
        label: "Pages",
        value: values.pageCount !== null ? String(values.pageCount) : null,
      },
      { label: "Features", value: values.features || null },
      { label: "Timeline", value: values.timeline || null },
      { label: "Budget", value: values.budget || null },
      {
        label: "Retainer",
        value:
          values.hasRetainer === null
            ? null
            : values.hasRetainer
              ? values.retainerAmount || "Agreed"
              : "No",
      },
    ].filter((r) => r.value !== null);

    return (
      <div className="bg-surface border border-white/7 rounded-2xl p-5 mb-10">
        <span className="block font-display text-[10px] font-semibold tracking-[0.18em] uppercase text-muted mb-4">
          Project Brief
        </span>
        {rows.length === 0 ? (
          <p className="text-faint text-[13px]">Brief not yet filled in.</p>
        ) : (
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
            {rows.map(({ label, value }) => (
              <div key={label}>
                <dt className="font-display text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
                  {label}
                </dt>
                <dd className="text-[13px] text-text leading-relaxed">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    );
  }

  const inputClass =
    "w-full bg-surface border border-white/7 rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-p1/50 placeholder:text-faint transition-colors";
  const labelClass =
    "block font-display text-[10px] font-semibold tracking-widest uppercase text-muted mb-1.5";

  return (
    <div className="pt-5 mt-5 border-t border-white/7">
      <h4 className="font-display text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
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
            className="w-full bg-surface border border-white/7 rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-p1/50 placeholder:text-faint resize-y transition-colors"
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
