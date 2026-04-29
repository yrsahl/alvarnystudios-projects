import { useFetcher } from "react-router";
import { useState, useRef } from "react";

export interface BrandData {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
}

const COLOR_FIELDS: { key: keyof BrandData; label: string }[] = [
  { key: "primaryColor", label: "Primary" },
  { key: "secondaryColor", label: "Secondary" },
  { key: "accentColor", label: "Accent" },
  { key: "bgColor", label: "Background" },
  { key: "textColor", label: "Text" },
];

interface Props {
  brand: BrandData;
}

export function BrandValuesPanel({ brand }: Props) {
  const fetcher = useFetcher({});
  const [values, setValues] = useState<BrandData>(brand);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function save(next: BrandData) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetcher.submit({ intent: "update-brand", ...next }, { method: "post" });
    }, 600);
  }

  function handleColorChange(key: keyof BrandData, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    save(next);
  }

  function handleFontChange(key: "headingFont" | "bodyFont", value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    save(next);
  }

  return (
    <div className="pt-5 mt-5 border-t border-white/7">
      <h4 className="font-display text-[10px] font-semibold tracking-widest uppercase text-muted mb-3">
        Brand Values
      </h4>

      {/* Color swatches */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        {COLOR_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <span className="font-display text-[9px] font-semibold tracking-widest uppercase text-muted">
              {label}
            </span>
            {/* Clickable swatch opens native color picker */}
            <div
              className="h-8 rounded-md border border-white/10 relative overflow-hidden cursor-pointer"
              style={{ backgroundColor: values[key] as string }}
            >
              <input
                type="color"
                value={values[key] as string}
                onChange={(e) => handleColorChange(key, e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            {/* Hex input */}
            <input
              type="text"
              value={(values[key] as string).toUpperCase()}
              maxLength={7}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                  handleColorChange(key, v);
                }
              }}
              className="w-full bg-surface border border-white/7 rounded px-1.5 py-1 font-display text-[10px] font-semibold tracking-widest text-text uppercase outline-none focus:border-p2/50 transition-colors"
            />
          </div>
        ))}
      </div>

      {/* Font inputs */}
      <div className="grid grid-cols-2 gap-3">
        {(["headingFont", "bodyFont"] as const).map((key) => (
          <div key={key}>
            <label className="block font-display text-[10px] font-semibold tracking-widest uppercase text-muted mb-1.5">
              {key === "headingFont" ? "Heading Font" : "Body Font"}
            </label>
            <input
              type="text"
              value={values[key]}
              placeholder={
                key === "headingFont"
                  ? "e.g. Syne, Playfair Display"
                  : "e.g. Instrument Sans, Inter"
              }
              onChange={(e) => handleFontChange(key, e.target.value)}
              className="w-full bg-surface border border-white/7 rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-p2/50 placeholder:text-faint transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
