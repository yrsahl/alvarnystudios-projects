import { useFetcher } from "react-router";
import { useEffect, useRef, useState } from "react";

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

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

function blendHex(hex: string, toward: number, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return (
    "#" +
    rgb.map((c) => Math.round(c + (toward - c) * amount).toString(16).padStart(2, "0")).join("")
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

function BrandPreview({ values }: { values: BrandData }) {
  const rgb = hexToRgb(values.bgColor);
  const luminance = rgb ? (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255 : 0;
  const isLight = luminance > 0.5;
  const surfaceTarget = isLight ? 0 : 255;
  const mutedText = isLight ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.42)";
  const surfaceBg = blendHex(values.bgColor, surfaceTarget, 0.06);
  const borderColor = blendHex(values.bgColor, surfaceTarget, 0.14);

  const headingFamily = values.headingFont.split(",")[0].trim();
  const bodyFamily = values.bodyFont.split(",")[0].trim();
  const headingFont = headingFamily
    ? `"${headingFamily}", ui-sans-serif, system-ui, sans-serif`
    : "ui-sans-serif, system-ui, sans-serif";
  const bodyFont = bodyFamily
    ? `"${bodyFamily}", ui-sans-serif, system-ui, sans-serif`
    : "ui-sans-serif, system-ui, sans-serif";

  return (
    <div
      style={{
        background: values.bgColor,
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${borderColor}`,
        fontSmooth: "always",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Nav bar */}
      <div
        style={{
          background: surfaceBg,
          borderBottom: `1px solid ${borderColor}`,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontFamily: headingFont, fontSize: 13, fontWeight: 700, color: values.textColor, letterSpacing: "-0.01em" }}>
          Your Brand
        </span>
        <div style={{ display: "flex", gap: 14 }}>
          {["About", "Services", "Contact"].map((item) => (
            <span key={item} style={{ fontFamily: bodyFont, fontSize: 11, color: mutedText }}>{item}</span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: "28px 20px 24px" }}>
        {/* Badge */}
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: `${values.accentColor}22`,
            border: `1px solid ${values.accentColor}44`,
            borderRadius: 99, padding: "3px 10px",
            marginBottom: 14,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: values.accentColor, display: "inline-block" }} />
          <span style={{ fontFamily: bodyFont, fontSize: 10, fontWeight: 600, color: values.accentColor, letterSpacing: "0.04em" }}>
            Now available
          </span>
        </div>

        {/* Heading */}
        <div
          style={{
            fontFamily: headingFont,
            fontSize: 26, fontWeight: 800,
            color: values.textColor,
            lineHeight: 1.15, letterSpacing: "-0.02em",
            marginBottom: 10,
          }}
        >
          Your Heading<br />
          <span style={{ color: values.primaryColor }}>Goes Here</span>
        </div>

        {/* Body */}
        <div
          style={{
            fontFamily: bodyFont,
            fontSize: 12, color: mutedText,
            lineHeight: 1.6, marginBottom: 18,
            maxWidth: 300,
          }}
        >
          A short description of what you do and why customers choose you over everyone else.
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              background: values.primaryColor, color: "#fff",
              borderRadius: 7, padding: "8px 16px",
              fontFamily: bodyFont, fontSize: 12, fontWeight: 600,
              letterSpacing: "0.01em",
            }}
          >
            Get started
          </span>
          <span
            style={{
              background: "transparent", color: values.textColor,
              border: `1px solid ${borderColor}`,
              borderRadius: 7, padding: "8px 16px",
              fontFamily: bodyFont, fontSize: 12,
            }}
          >
            Learn more →
          </span>
        </div>
      </div>

      {/* Footer strip */}
      <div
        style={{
          background: surfaceBg,
          borderTop: `1px solid ${borderColor}`,
          padding: "8px 16px",
          display: "flex", gap: 6,
        }}
      >
        {[values.primaryColor, values.secondaryColor, values.accentColor].map((c, i) => (
          <span key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: c, display: "block" }} />
        ))}
      </div>
    </div>
  );
}

interface Props {
  brand: BrandData;
}

export function BrandValuesPanel({ brand }: Props) {
  const fetcher = useFetcher({});
  const [values, setValues] = useState<BrandData>(brand);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hadSubmission = useRef(false);

  useEffect(() => {
    if (fetcher.state !== "idle") { hadSubmission.current = true; return; }
    if (!hadSubmission.current) return;
    hadSubmission.current = false;
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [fetcher.state]);

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
    const family = value.split(",")[0].trim();
    if (family) loadGoogleFont(family);
    save(next);
  }

  return (
    <div className="pt-5 mt-5 border-t border-border">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Brand Values
        </h4>
        <span className={`text-xs text-muted-foreground transition-opacity duration-500 ${saved ? "opacity-100" : "opacity-0"}`}>
          Saved ✓
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2.5">
            {COLOR_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {label}
                </span>
                <div
                  className="h-8 rounded-md border border-border relative overflow-hidden cursor-pointer"
                  style={{ backgroundColor: values[key] as string }}
                >
                  <input
                    type="color"
                    value={values[key] as string}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    suppressHydrationWarning
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
                  className="w-full bg-background border border-border rounded px-1.5 py-1 text-[10px] font-mono tracking-wider text-foreground uppercase outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2.5">
            {(["headingFont", "bodyFont"] as const).map((key) => (
              <div key={key}>
                <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  {key === "headingFont" ? "Heading Font" : "Body Font"}
                </label>
                <input
                  type="text"
                  value={values[key]}
                  placeholder={key === "headingFont" ? "e.g. Syne, Playfair Display" : "e.g. Inter, Instrument Sans"}
                  onChange={(e) => handleFontChange(key, e.target.value)}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <BrandPreview values={values} />
      </div>
    </div>
  );
}
