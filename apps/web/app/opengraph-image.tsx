import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

// Rendered once at build time into a static PNG (the site is a static export).
export const dynamic = "force-static";
export const alt = `${site.name}: your AI text has invisible characters in it`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand colors from globals.css (light theme) and the logo.
const paper = "#f6f4ef";
const ink = "#17150f";
const muted = "#6b675d";
const strip = "#d4380d";

export default async function OpengraphImage() {
  // Satori can't read woff2 from next/font, so the display face ships as TTF.
  const fonts = join(process.cwd(), "assets");
  const [serif, serifItalic] = await Promise.all([
    readFile(join(fonts, "InstrumentSerif-Regular.ttf")),
    readFile(join(fonts, "InstrumentSerif-Italic.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: paper,
          color: ink,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 34 }}>
          <svg viewBox="0 0 32 32" width="64" height="64">
            <rect width="32" height="32" rx="9" fill={ink} />
            <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="12,9.5 6.5,16 12,22.5" />
              <polyline points="20,9.5 25.5,16 20,22.5" />
            </g>
            <circle cx="16" cy="16" r="3" fill={strip} />
          </svg>
          {site.name}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontFamily: "Instrument Serif",
            fontSize: 104,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            columnGap: "0.25em",
          }}
        >
          {/* One span per word: Satori keeps a span's spaces when it wraps lines. */}
          {"Your AI text has invisible characters in it.".split(" ").map((word) => (
            <span key={word} style={word === "invisible" ? { fontStyle: "italic", color: strip } : {}}>
              {word}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, color: muted }}>
          <span>Find and remove hidden Unicode watermarks, free</span>
          <span>{site.url.replace(/^https:\/\/www\./, "")}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Instrument Serif", data: serif, style: "normal", weight: 400 },
        { name: "Instrument Serif", data: serifItalic, style: "italic", weight: 400 },
      ],
    },
  );
}
