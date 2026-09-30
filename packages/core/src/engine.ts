// Layer A: invisible Unicode / homoglyph space detection and cleaning.
// Ported from guillaumemeyer/watermarks-remover service/scripts/text_unicode.py
// (MIT, Copyright (c) Guillaume Meyer). See NOTICE.
//
// Everything iterates over code points, never UTF-16 units, so offsets and
// lengths match the Python original. Annotations additionally carry UTF-16
// offsets for UIs.

import { charLabel, formatCodepoint } from "./names";
import { changedInputCount } from "./sequence-matcher";
import {
  BIDI_CPS,
  EMOJI_GLUE_CODEPOINTS,
  HANGUL_FILLERS,
  KHMER_VOWELS,
  LATIN_CONFUSABLES,
  MONGOLIAN_FVS,
  ORTHOGRAPHIC_CF,
  PRESERVABLE_BIDI_CPS,
  SCRIPT_GLUE,
  SCRIPT_JOINERS,
  SPACE_HOMOGLYPHS,
  STRIP_CODEPOINTS,
  ZW_FAMILY,
  inSpan,
  isNoncharacter,
  isPrivateUse,
  isReservedIgnorable,
  isTagRange,
  isVsSupplement,
  layoutCfScript,
} from "./tables";

export type HitKind =
  | "strip"
  | "bidi"
  | "tag_chars"
  | "variation_selector"
  | "zwj_family"
  | "private_use"
  | "noncharacter"
  | "reserved_ignorable"
  | "space"
  | "confusable"
  | "other_cf";

export type Action = "keep" | "strip" | "replace";

const CF_RE = /^\p{Cf}$/u;
const LETTER_OR_MARK_RE = /^[\p{L}\p{M}]$/u;
const LETTER_RE = /^\p{L}$/u;

const cpOf = (ch: string) => ch.codePointAt(0)!;

function isStripCp(cp: number): boolean {
  return (
    STRIP_CODEPOINTS.has(cp) ||
    isVsSupplement(cp) ||
    (cp >= 0xe0001 && cp <= 0xe007f) || // tag characters
    isNoncharacter(cp) ||
    isReservedIgnorable(cp) ||
    isPrivateUse(cp)
  );
}

function isVariationSelector(cp: number): boolean {
  return isVsSupplement(cp) || (cp >= 0xfe00 && cp <= 0xfe0f) || MONGOLIAN_FVS.has(cp);
}

function stripKind(cp: number): HitKind {
  if (cp >= 0xe0001 && cp <= 0xe007f) return "tag_chars";
  if (isNoncharacter(cp)) return "noncharacter";
  if (isReservedIgnorable(cp)) return "reserved_ignorable";
  if (isVariationSelector(cp)) return "variation_selector";
  if (BIDI_CPS.has(cp)) return "bidi";
  if (ZW_FAMILY.has(cp)) return "zwj_family";
  if (isPrivateUse(cp)) return "private_use";
  return "strip";
}

function isEmojiBase(cp: number): boolean {
  if (cp >= 0x1f000 && cp <= 0x1faff) return true;
  if (cp >= 0x2190 && cp <= 0x25ff) return true; // arrows, technical, enclosed
  if (cp >= 0x2600 && cp <= 0x27bf) return true; // misc symbols, dingbats
  if (cp >= 0x2b00 && cp <= 0x2bff) return true; // misc symbols and arrows
  // Emoji=Yes singletons outside the ranges above: !!, !?, i, curved arrows.
  if ([0x203c, 0x2049, 0x2139, 0x2934, 0x2935].includes(cp)) return true;
  if ([0x00a9, 0x00ae, 0x2122, 0x3030, 0x303d, 0x3297, 0x3299].includes(cp)) return true;
  // keycap bases
  return cp === 0x23 || cp === 0x2a || (cp >= 0x30 && cp <= 0x39);
}

const JOINING_SCRIPTS: readonly [number, number, string][] = [
  [0x0600, 0x08ff, "arabic"],
  [0x0900, 0x0dff, "indic"],
  [0x0f00, 0x109f, "south-asian"],
  [0x1780, 0x17ff, "khmer"],
  [0x1800, 0x18af, "mongolian"],
];

/** Broad script group where ZWJ/ZWNJ can be orthographic. */
function joiningScript(cp: number): string | null {
  for (const [start, end, name] of JOINING_SCRIPTS) {
    if (cp >= start && cp <= end && LETTER_OR_MARK_RE.test(String.fromCodePoint(cp))) {
      return name;
    }
  }
  return null;
}

const isCjkIdeograph = (cp: number) =>
  (cp >= 0x3400 && cp <= 0x4dbf) ||
  (cp >= 0x4e00 && cp <= 0x9fff) ||
  (cp >= 0xf900 && cp <= 0xfaff) ||
  (cp >= 0x20000 && cp <= 0x323af);

const isMongolianBase = (cp: number) => cp >= 0x1800 && cp <= 0x18af;
const isMongolianLetter = (cp: number) =>
  isMongolianBase(cp) && LETTER_RE.test(String.fromCodePoint(cp));
const isKhmerLetter = (cp: number) =>
  cp >= 0x1780 && cp <= 0x17ff && LETTER_RE.test(String.fromCodePoint(cp));

// Conjoining jamo plus compatibility and halfwidth forms, so each filler can
// follow letters of its own form.
const isHangulJamo = (cp: number) =>
  (cp >= 0x1100 && cp <= 0x11ff) ||
  (cp >= 0xa960 && cp <= 0xa97c) ||
  (cp >= 0xd7b0 && cp <= 0xd7c6) ||
  (cp >= 0x3131 && cp <= 0x318e) ||
  (cp >= 0xffa1 && cp <= 0xffdc);

/** Load-bearing invisible: emoji glue, script joiner, flag tag, same-script filler. */
function isGlue(cp: number): boolean {
  return (
    EMOJI_GLUE_CODEPOINTS.has(cp) ||
    isVariationSelector(cp) ||
    SCRIPT_JOINERS.has(cp) ||
    isTagRange(cp) ||
    SCRIPT_GLUE.has(cp)
  );
}

/** Indices in complete subdivision-flag tag sequences. */
function validFlagTagIndices(cps: readonly number[]): Set<number> {
  const valid = new Set<number>();
  let i = 0;
  while (i < cps.length) {
    if (cps[i] !== 0x1f3f4) {
      i += 1;
      continue;
    }
    let j = i + 1;
    while (j < cps.length && cps[j] >= 0xe0020 && cps[j] <= 0xe007e) j += 1;
    if (j > i + 1 && j < cps.length && cps[j] === 0xe007f) {
      for (let k = i + 1; k <= j; k++) valid.add(k);
      i = j + 1;
    } else {
      i += 1;
    }
  }
  return valid;
}

/** Indices belonging to complete LRE/RLE ... PDF pairs, excluding overrides. */
function validBidiEmbeddingIndices(cps: readonly number[]): Set<number> {
  const valid = new Set<number>();
  const stack: [number, number][] = [];
  cps.forEach((cp, index) => {
    if (cp === 0x202a || cp === 0x202b || cp === 0x202d || cp === 0x202e) {
      stack.push([cp, index]);
    } else if (cp === 0x202c) {
      const top = stack.pop();
      if (top && (top[0] === 0x202a || top[0] === 0x202b)) {
        valid.add(top[1]);
        valid.add(index);
      }
    }
  });
  return valid;
}

interface DecideFlags {
  validFlagTag: boolean;
  validBidiEmbedding: boolean;
  normalizeSpaces: boolean;
  treatConfusables: boolean;
  stripEmojiGlue: boolean;
  stripBidi: boolean;
}

type Decision = [action: Action, out: string, kind: HitKind | null];

/** Classify one input code point for both inspect and clean. */
function decide(
  cp: number,
  prevKept: number | null,
  prevInput: number | null,
  nextInput: number | null,
  f: DecideFlags,
): Decision {
  const ch = String.fromCodePoint(cp);
  const keep: Decision = ["keep", ch, null];
  if (f.validBidiEmbedding && !f.stripBidi) return keep;
  if (PRESERVABLE_BIDI_CPS.has(cp) && !f.stripBidi) return keep;
  if (prevInput !== null && !f.stripEmojiGlue) {
    if (isVsSupplement(cp) && isCjkIdeograph(prevInput)) return keep;
    if (MONGOLIAN_FVS.has(cp) && isMongolianBase(prevInput)) return keep;
    if (cp >= 0xfe00 && cp <= 0xfe0d && isCjkIdeograph(prevInput)) return keep;
  }
  if (EMOJI_GLUE_CODEPOINTS.has(cp) && !f.stripEmojiGlue) {
    if ((cp === 0xfe0e || cp === 0xfe0f) && prevInput !== null && isEmojiBase(prevInput)) {
      return keep;
    }
    if (
      cp === 0x200d &&
      prevKept !== null &&
      nextInput !== null &&
      isEmojiBase(prevKept) &&
      isEmojiBase(nextInput)
    ) {
      return keep;
    }
  }
  if (!f.stripEmojiGlue) {
    if (SCRIPT_JOINERS.has(cp) && prevInput !== null && nextInput !== null) {
      const prevScript = joiningScript(prevInput);
      if (prevScript !== null && prevScript === joiningScript(nextInput)) return keep;
    }
    if (isTagRange(cp) && f.validFlagTag) return keep;
    if (MONGOLIAN_FVS.has(cp) && prevKept !== null && isMongolianLetter(prevKept)) return keep;
    if (KHMER_VOWELS.has(cp) && prevKept !== null && isKhmerLetter(prevKept)) return keep;
    if (HANGUL_FILLERS.has(cp) && prevKept !== null && isHangulJamo(prevKept)) return keep;
    if (ORTHOGRAPHIC_CF.has(cp)) return keep;
    const script = layoutCfScript(cp);
    if (
      script !== null &&
      ((prevInput !== null && inSpan(prevInput, script)) ||
        (nextInput !== null && inSpan(nextInput, script)))
    ) {
      return keep;
    }
  }
  if (isStripCp(cp)) return ["strip", "", stripKind(cp)];
  if (f.normalizeSpaces && SPACE_HOMOGLYPHS.has(cp)) {
    return ["replace", SPACE_HOMOGLYPHS.get(cp)!, "space"];
  }
  if (f.treatConfusables && LATIN_CONFUSABLES.has(cp)) {
    return ["replace", LATIN_CONFUSABLES.get(cp)!, "confusable"];
  }
  if (CF_RE.test(ch) && !SPACE_HOMOGLYPHS.has(cp)) return ["strip", "", "other_cf"];
  return keep;
}

/** One decision per input code point. */
export interface CharDecision {
  /** Code point index (matches Python string offsets). */
  index: number;
  /** UTF-16 offset into the original JS string. */
  offset: number;
  char: string;
  action: Action;
  out: string;
  kind: HitKind | null;
}

type ScanFlags = Omit<DecideFlags, "validFlagTag" | "validBidiEmbedding">;

function scan(text: string, flags: ScanFlags): CharDecision[] {
  const chars = Array.from(text);
  const cps = chars.map(cpOf);
  const validFlagTags = validFlagTagIndices(cps);
  const validBidiEmbeddings = validBidiEmbeddingIndices(cps);
  const decisions: CharDecision[] = [];
  let prevKept: number | null = null;
  let offset = 0;
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i];
    const [action, out, kind] = decide(
      cp,
      prevKept,
      i > 0 ? cps[i - 1] : null,
      i + 1 < cps.length ? cps[i + 1] : null,
      {
        ...flags,
        validFlagTag: validFlagTags.has(i),
        validBidiEmbedding: validBidiEmbeddings.has(i),
      },
    );
    // Glue (emoji/script joiner/tag) does not advance the "previous kept"
    // base, so ZWJ chains and flag runs stay bound. Strips leave it alone.
    if ((action === "keep" && !isGlue(cp)) || action === "replace") {
      prevKept = cpOf(out);
    }
    decisions.push({ index: i, offset, char: chars[i], action, out, kind });
    offset += chars[i].length;
  }
  return decisions;
}

export interface CleanOptions {
  /** Apply Unicode NFKC compatibility normalization after cleaning. */
  nfkc?: boolean;
  /** Replace Cyrillic and fullwidth Latin lookalikes with ASCII. */
  aggressiveHomoglyphs?: boolean;
  /** Replace exotic spaces (NBSP, em space, ...) with U+0020. Default true. */
  normalizeSpaces?: boolean;
  /** Also strip load-bearing emoji/script glue (ZWJ in 👨‍👩‍👧, Persian ZWNJ, ...). */
  stripEmojiGlue?: boolean;
  /** Also strip directional marks, isolates and paired embeddings. */
  stripBidi?: boolean;
}

export interface CleanStats {
  input_length: number;
  output_length: number;
  removed: Record<string, number>;
  replaced: Record<string, number>;
  removed_count: number;
  replaced_count: number;
  nfkc_changed: boolean;
}

export interface CleanResult {
  text: string;
  stats: CleanStats;
}

function cleanFlags(opts: CleanOptions): ScanFlags {
  return {
    normalizeSpaces: opts.normalizeSpaces ?? true,
    treatConfusables: opts.aggressiveHomoglyphs ?? false,
    stripEmojiGlue: opts.stripEmojiGlue ?? false,
    stripBidi: opts.stripBidi ?? false,
  };
}

const bump = (counter: Record<string, number>, key: string, n = 1) => {
  counter[key] = (counter[key] ?? 0) + n;
};
const total = (counter: Record<string, number>) =>
  Object.values(counter).reduce((a, b) => a + b, 0);
const cpLength = (s: string) => {
  let n = 0;
  for (const _ of s) n++;
  return n;
};

/** Return cleaned text and a stats object (same shape as the Python engine). */
export function cleanText(text: string, opts: CleanOptions = {}): CleanResult {
  const removed: Record<string, number> = {};
  const replaced: Record<string, number> = {};
  const out: string[] = [];
  for (const d of scan(text, cleanFlags(opts))) {
    if (d.action === "strip") {
      bump(removed, charLabel(d.char));
    } else {
      out.push(d.out);
      if (d.action === "replace") bump(replaced, charLabel(d.char));
    }
  }

  let result = out.join("");
  let nfkcChanged = false;
  if (opts.nfkc) {
    const before = result;
    result = result.normalize("NFKC");
    if (result !== before) {
      nfkcChanged = true;
      bump(replaced, "NFKC_normalize", changedInputCount(before, result) || 1);
    }
  }

  return {
    text: result,
    stats: {
      input_length: cpLength(text),
      output_length: cpLength(result),
      removed,
      replaced,
      removed_count: total(removed),
      replaced_count: total(replaced),
      nfkc_changed: nfkcChanged,
    },
  };
}

export type Confidence = "informational" | "probable";

export interface InspectHit {
  codepoint: string;
  label: string;
  count: number;
  kind: HitKind;
  confidence: Confidence;
  sample_offsets: number[];
}

export interface InspectReport {
  length: number;
  suspicious_total: number;
  hits: InspectHit[];
  notes: string[];
}

export interface InspectOptions {
  aggressive?: boolean;
  stripEmojiGlue?: boolean;
}

function inspectFlags(opts: InspectOptions): ScanFlags {
  return {
    normalizeSpaces: true,
    treatConfusables: opts.aggressive ?? false,
    stripEmojiGlue: opts.stripEmojiGlue ?? false,
    stripBidi: true,
  };
}

const hitConfidence = (kind: HitKind): Confidence =>
  kind === "space" ? "informational" : "probable";

/** Report suspicious code points, grouped by (code point, kind). */
export function inspectText(text: string, opts: InspectOptions = {}): InspectReport {
  const buckets = new Map<string, { cp: number; kind: HitKind; offsets: number[] }>();
  const decisions = scan(text, inspectFlags(opts));
  for (const d of decisions) {
    if (d.kind === null) continue;
    const cp = cpOf(d.char);
    const key = `${cp}:${d.kind}`;
    let bucket = buckets.get(key);
    if (!bucket) buckets.set(key, (bucket = { cp, kind: d.kind, offsets: [] }));
    bucket.offsets.push(d.index);
  }

  const sorted = [...buckets.values()].sort(
    (a, b) => b.offsets.length - a.offsets.length || a.cp - b.cp,
  );
  const hits = sorted.map(
    ({ cp, kind, offsets }): InspectHit => ({
      codepoint: formatCodepoint(cp),
      label: charLabel(String.fromCodePoint(cp)),
      count: offsets.length,
      kind,
      confidence: hitConfidence(kind),
      sample_offsets: offsets.slice(0, 10),
    }),
  );

  const notes = [
    "Layer A only: invisible/format Unicode and space homoglyphs (edit-based carriers).",
    "Statistical (token-sampling) watermarks are not detectable here; use Layer B rewrite.",
    "Inspect kinds: strip, bidi, tag_chars, variation_selector, zwj_family, private_use, space, confusable, other_cf.",
    "Load-bearing invisibles are preserved by default during cleaning: emoji glue, CJK/Mongolian variation selectors, script joiners, complete flag tag sequences, same-script fillers/selectors (Mongolian FVS, Khmer inherent vowels, Hangul jamo fillers), RTL directional marks/paired embeddings, orthographic Arabic/Syriac Cf marks, and visible-layout format controls next to their own script (Egyptian hieroglyph quadrat, Duployan shorthand, musical beaming). Inspection still reports bidi controls. Use explicit strip flags only after review.",
  ];
  if (hits.length === 0) {
    notes.push(
      "No deterministic Layer A (invisible Unicode/format) carriers detected; " +
        "statistical and pixel-domain marks are out of scope here.",
    );
  }
  return {
    length: decisions.length,
    suspicious_total: hits.reduce((n, h) => n + h.count, 0),
    hits,
    notes,
  };
}

/** A run of untouched text, or one flagged code point. */
export type Segment =
  | { type: "text"; text: string }
  | {
      type: "mark";
      /** The original character. */
      char: string;
      codepoint: number;
      /** UTF-16 offset of the character in the input. */
      offset: number;
      /** What cleaning does with it. "keep" means flagged but preserved as load-bearing. */
      action: Action;
      /** Replacement text for action "replace". */
      replacement: string;
      kind: HitKind;
      label: string;
    };

/**
 * Split text into plain runs and flagged characters for display. A character
 * is flagged if cleaning with `opts` strips or replaces it, or if inspection
 * reports it even though cleaning keeps it (load-bearing glue, bidi marks,
 * spaces kept because normalizeSpaces is off). NFKC is not reflected here.
 */
export function annotate(text: string, opts: CleanOptions = {}): Segment[] {
  const clean = scan(text, cleanFlags(opts));
  const inspect = scan(
    text,
    inspectFlags({ aggressive: opts.aggressiveHomoglyphs, stripEmojiGlue: opts.stripEmojiGlue }),
  );
  const segments: Segment[] = [];
  let run = "";
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    const kind = c.kind ?? inspect[i].kind;
    if (kind === null) {
      run += c.char;
      continue;
    }
    if (run) segments.push({ type: "text", text: run });
    run = "";
    segments.push({
      type: "mark",
      char: c.char,
      codepoint: cpOf(c.char),
      offset: c.offset,
      action: c.action,
      replacement: c.action === "replace" ? c.out : "",
      kind,
      label: charLabel(c.char),
    });
  }
  if (run) segments.push({ type: "text", text: run });
  return segments;
}
