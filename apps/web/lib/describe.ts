import type { HitKind, Segment } from "@i-hate-watermarks/core";

type Mark = Extract<Segment, { type: "mark" }>;

export const KIND_LABELS: Record<HitKind, string> = {
  zwj_family: "Zero-width characters",
  tag_chars: "Tag characters",
  bidi: "Text-direction controls",
  variation_selector: "Variation selectors",
  private_use: "Private-use characters",
  noncharacter: "Noncharacters",
  reserved_ignorable: "Reserved invisible code points",
  space: "Lookalike spaces",
  confusable: "Lookalike letters",
  other_cf: "Other invisible format characters",
  strip: "Other invisible characters",
};

const SHORT_NAMES: Record<number, string> = {
  0x00a0: "NBSP",
  0x00ad: "SHY",
  0x034f: "CGJ",
  0x061c: "ALM",
  0x180e: "MVS",
  0x1680: "OGHAM SP",
  0x2000: "NQSP",
  0x2001: "MQSP",
  0x2002: "ENSP",
  0x2003: "EMSP",
  0x2004: "3/MSP",
  0x2005: "4/MSP",
  0x2006: "6/MSP",
  0x2007: "FSP",
  0x2008: "PUNCSP",
  0x2009: "THSP",
  0x200a: "HSP",
  0x200b: "ZWSP",
  0x200c: "ZWNJ",
  0x200d: "ZWJ",
  0x200e: "LRM",
  0x200f: "RLM",
  0x202a: "LRE",
  0x202b: "RLE",
  0x202c: "PDF",
  0x202d: "LRO",
  0x202e: "RLO",
  0x202f: "NNBSP",
  0x205f: "MMSP",
  0x2060: "WJ",
  0x2061: "FA",
  0x2062: "IT",
  0x2063: "IS",
  0x2064: "IP",
  0x2066: "LRI",
  0x2067: "RLI",
  0x2068: "FSI",
  0x2069: "PDI",
  0x3000: "IDSP",
  0xfeff: "BOM",
  0xe0001: "LANG TAG",
  0xe007f: "CANCEL TAG",
};

/** Short badge text for a flagged character. */
export function shortName(mark: Mark): string {
  const cp = mark.codepoint;
  if (SHORT_NAMES[cp]) return SHORT_NAMES[cp];
  if (cp >= 0xfe00 && cp <= 0xfe0f) return `VS${cp - 0xfe00 + 1}`;
  if (cp >= 0xe0100 && cp <= 0xe01ef) return `VS${cp - 0xe0100 + 17}`;
  if (cp >= 0xe0020 && cp <= 0xe007e) return `TAG ${String.fromCodePoint(cp - 0xe0000)}`;
  if (mark.kind === "confusable") return mark.char;
  return "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
}

export function actionText(mark: Mark): string {
  if (mark.action === "strip") return "removed";
  if (mark.action === "replace") {
    return mark.replacement === " " ? "replaced with a normal space" : `replaced with “${mark.replacement}”`;
  }
  if (mark.kind === "space") return "kept, because “Normalize lookalike spaces” is off";
  // Every other flagged-but-kept character is one the engine preserves
  // deliberately (see `annotate`): bidi marks/isolates and paired embeddings.
  return "kept, because text direction may depend on it (turn on “Also strip direction marks” to remove)";
}

/**
 * Tag characters U+E0020–U+E007E mirror printable ASCII and render invisibly,
 * so they can smuggle a whole hidden message. Decode each stripped run.
 */
export function hiddenTagMessages(segments: readonly Segment[]): string[] {
  const messages: string[] = [];
  let current = "";
  const flush = () => {
    if (current.trim()) messages.push(current);
    current = "";
  };
  for (const s of segments) {
    if (s.type === "mark" && s.action === "strip" && s.codepoint >= 0xe0020 && s.codepoint <= 0xe007e) {
      current += String.fromCodePoint(s.codepoint - 0xe0000);
    } else if (!(s.type === "mark" && s.kind === "tag_chars")) {
      flush();
    }
  }
  flush();
  return messages;
}
