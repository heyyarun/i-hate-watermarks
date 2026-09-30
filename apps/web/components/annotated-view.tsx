import { memo } from "react";
import type { Segment } from "@i-hate-watermarks/core";
import { KIND_LABELS, actionText, shortName } from "@/lib/describe";

const ACTION_CLASS = {
  strip: "mark-strip",
  replace: "mark-replace",
  keep: "mark-keep",
} as const;

type TagRun = { type: "tags"; count: number; decoded: string };

// Invisible tag characters usually come in long runs (one per smuggled ASCII
// letter), so show each stripped run as a single badge.
function groupTagRuns(segments: Segment[]): (Segment | TagRun)[] {
  const out: (Segment | TagRun)[] = [];
  for (const s of segments) {
    const isTag = s.type === "mark" && s.kind === "tag_chars" && s.action === "strip";
    const last = out[out.length - 1];
    if (!isTag) out.push(s);
    else if (last?.type === "tags") {
      last.count++;
      last.decoded += tagChar(s.codepoint);
    } else out.push({ type: "tags", count: 1, decoded: tagChar(s.codepoint) });
  }
  return out;
}

const tagChar = (cp: number) =>
  cp >= 0xe0020 && cp <= 0xe007e ? String.fromCodePoint(cp - 0xe0000) : "";

// Renders the input with every flagged character turned into a visible badge.
// Kept characters are still emitted after their badge so emoji and scripts
// render as they will in the output.
export const AnnotatedView = memo(function AnnotatedView({ segments }: { segments: Segment[] }) {
  if (!segments.some((s) => s.type === "mark")) return null;
  return (
    <div className="px-5 pt-4">
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          <span className="mark mark-strip">ZWSP</span> removed
        </span>
        <span>
          <span className="mark mark-replace">NBSP</span> replaced
        </span>
        <span>
          <span className="mark mark-keep">LRI</span> flagged but kept
        </span>
        <span>Hover a badge for details.</span>
      </div>
      <div className="annotated">
        {groupTagRuns(segments).map((s, i) => {
          if (s.type === "text") return <span key={i}>{s.text}</span>;
          if (s.type === "tags") {
            const title = `${s.count} tag characters (U+E0000–U+E007F): removed\nThey spell: “${s.decoded}”`;
            return (
              <abbr key={i} className="mark mark-strip" title={title} aria-label={title}>
                {s.count} TAGS
              </abbr>
            );
          }
          const title = `${s.label}\n${KIND_LABELS[s.kind]}: ${actionText(s)}`;
          return (
            <span key={i}>
              <abbr className={`mark ${ACTION_CLASS[s.action]}`} title={title} aria-label={title}>
                {shortName(s)}
              </abbr>
              {s.action === "keep" && s.char}
            </span>
          );
        })}
      </div>
    </div>
  );
});
