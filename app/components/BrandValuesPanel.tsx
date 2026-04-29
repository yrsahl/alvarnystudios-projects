import { useFetcher } from "react-router";
import { useEffect, useState, useRef } from "react";

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

// --- Preview helpers (run in browser only) ---

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

function blendHex(hex: string, toward: number, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return (
    "#" +
    rgb
      .map((c) => Math.round(c + (toward - c) * amount).toString(16).padStart(2, "0"))
      .join("")
  );
}

function loadGoogleFont(name: string) {
  const id = `gf-${name.replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${name.replace(/\s+/g, "+")}:wght@400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

function applyBrandPreview(brand: BrandData) {
  const root = document.documentElement;
  const rgb = hexToRgb(brand.bgColor);
  const luminance = rgb ? (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255 : 0;
  const isLight = luminance > 0.5;
  const surfaceTarget = isLight ? 0 : 255;

  root.style.setProperty("--color-bg", brand.bgColor);
  root.style.setProperty("--color-surface", blendHex(brand.bgColor, surfaceTarget, 0.05));
  root.style.setProperty("--color-surface2", blendHex(brand.bgColor, surfaceTarget, 0.12));
  root.style.setProperty("--color-text", brand.textColor);
  root.style.setProperty("--color-muted", isLight ? "#555555" : "#8c8b84");
  root.style.setProperty("--color-faint", isLight ? "#bbbbbb" : "#3a3a3e");
  root.style.setProperty("--color-p1", brand.primaryColor);
  root.style.setProperty("--color-p2", brand.secondaryColor);
  root.style.setProperty("--color-p3", brand.accentColor);

  const headingFamily = brand.headingFont.split(",")[0].trim();
  const bodyFamily = brand.bodyFont.split(",")[0].trim();

  if (headingFamily) {
    root.style.setProperty(
      "--font-display",
      `"${headingFamily}", ui-sans-serif, system-ui, sans-serif`,
    );
    loadGoogleFont(headingFamily);
  }
  if (bodyFamily) {
    root.style.setProperty(
      "--font-sans",
      `"${bodyFamily}", ui-sans-serif, system-ui, sans-serif`,
    );
    loadGoogleFont(bodyFamily);
  }
}

// ---

interface Props {
  brand: BrandData;
}

export function BrandValuesPanel({ brand }: Props) {
  const fetcher = useFetcher({});
  const [values, setValues] = useState<BrandData>(brand);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Apply preview on mount and whenever values change
  useEffect(() => {
    applyBrandPreview(values);
  }, [values]);

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
            <input
              type="text"
              value={(values[key] as string).toUpperCase()}
              maxLength={7}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) handleColorChange(key, v);
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
