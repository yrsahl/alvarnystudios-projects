import { Form, redirect } from "react-router";
import { db } from "~/db/index.server";
import { projects } from "~/db/schema";
import { eq } from "drizzle-orm";
import type { Route } from "./+types/view";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Client Portal — Alvarnystudios" },
    { name: "description", content: "Access your web project overview." },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toLowerCase();

  if (!code) return { error: "Please enter a project code." };

  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, code),
  });

  if (!project) {
    return { error: "Project code not found. Check with your project manager." };
  }

  return redirect(`/view/${project.slug}`);
}

const serif = "'Instrument Serif', 'Times New Roman', serif";
const mono = "'Geist Mono', ui-monospace, monospace";
const sans = "'Geist', ui-sans-serif, system-ui, sans-serif";
const paper = "#fafaf7";
const ink = "#1a1a1a";
const ink3 = "#52525b";
const ink4 = "#a1a1aa";
const line = "rgba(26,26,26,0.08)";

export default function ClientEntry({ actionData }: Route.ComponentProps) {
  return (
    <div
      className="client-portal"
      style={{ minHeight: "100vh", background: paper, display: "flex", flexDirection: "column" }}
    >
      {/* Minimal nav */}
      <header
        style={{
          padding: "18px 32px",
          borderBottom: `1px solid ${line}`,
          background: `color-mix(in oklab, ${paper} 80%, transparent)`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <a
          href="https://alvarnystudios.com"
          style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: ink, color: paper,
              display: "grid", placeItems: "center",
              fontFamily: serif, fontStyle: "italic", fontSize: 18, lineHeight: 1,
              paddingBottom: 2,
            }}
          >
            A
          </div>
          <span style={{ fontFamily: serif, fontSize: 22, color: ink, letterSpacing: "-0.01em" }}>
            <span style={{ fontStyle: "italic" }}>Alvarny</span>
            {" "}
            <span style={{ fontFamily: mono, fontStyle: "normal", fontSize: 11, color: ink3, letterSpacing: "0.05em" }}>
              STUDIOS
            </span>
          </span>
        </a>
      </header>

      {/* Centered form */}
      <div
        style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "48px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>
          {/* Eyebrow */}
          <p
            style={{
              fontFamily: mono, fontSize: 11, color: ink3,
              textTransform: "uppercase", letterSpacing: "0.08em",
              display: "flex", alignItems: "center", gap: 8, marginBottom: 20,
            }}
          >
            <span
              style={{
                display: "inline-block", width: 6, height: 6,
                background: "#dc2626", borderRadius: "50%",
              }}
            />
            Client Portal
          </p>

          <h1
            style={{
              fontFamily: serif, fontWeight: 400,
              fontSize: "clamp(40px, 8vw, 64px)", lineHeight: 0.96,
              letterSpacing: "-0.02em", color: ink,
              marginBottom: 20,
            }}
          >
            Your<br />
            <em style={{ fontStyle: "italic", color: "#dc2626" }}>project.</em>
          </h1>

          <p style={{ fontFamily: sans, fontSize: 15, color: ink3, lineHeight: 1.55, marginBottom: 36 }}>
            Enter the project code your designer shared with you.
          </p>

          <Form method="post" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  fontFamily: mono, fontSize: 11, color: ink3,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}
              >
                Project code
              </label>
              <input
                type="text"
                name="code"
                placeholder="e.g. abc12345"
                autoComplete="off"
                autoFocus
                style={{
                  background: "#ffffff", border: `1px solid ${line}`,
                  borderRadius: 10, padding: "12px 16px",
                  fontFamily: mono, fontSize: 15, color: ink,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  textAlign: "center", outline: "none", width: "100%",
                  boxSizing: "border-box", transition: "border-color 180ms ease",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = ink; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = line; }}
              />
            </div>

            {actionData?.error && (
              <p style={{ fontFamily: sans, fontSize: 13, color: "#dc2626", textAlign: "center" }}>
                {actionData.error}
              </p>
            )}

            <button
              type="submit"
              style={{
                background: ink, color: paper, border: "none",
                borderRadius: 999, padding: "13px 24px",
                fontFamily: sans, fontSize: 14, fontWeight: 500,
                cursor: "pointer", transition: "background 200ms ease",
                marginTop: 4,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#dc2626"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ink; }}
            >
              Open my project →
            </button>
          </Form>
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          padding: "24px 32px",
          borderTop: `1px solid ${line}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontFamily: mono, fontSize: 11, color: ink4, letterSpacing: "0.04em",
        }}
      >
        <span>© {new Date().getFullYear()} Alvarnystudios</span>
        <a href="https://alvarnystudios.com" style={{ color: ink4, textDecoration: "none" }}>
          alvarnystudios.com ↗
        </a>
      </footer>
    </div>
  );
}
