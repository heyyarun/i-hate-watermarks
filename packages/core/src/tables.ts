// Character tables for Layer A cleaning.
// Ported from guillaumemeyer/watermarks-remover service/scripts/text_unicode.py
// (MIT, Copyright (c) Guillaume Meyer). See NOTICE.

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start }, (_, i) => start + i);

// Format / invisible controls commonly used for steganography or broken pastes.
export const STRIP_CODEPOINTS: ReadonlySet<number> = new Set([
  0x00ad, // soft hyphen
  0x034f, // combining grapheme joiner
  0x061c, // Arabic letter mark
  0x115f, // Hangul choseong filler
  0x1160, // Hangul jungseong filler
  0x17b4, // Khmer vowel inherent AQ
  0x17b5, // Khmer vowel inherent AA
  0x180b, 0x180c, 0x180d, // Mongolian free variation selectors 1-3
  0x180e, // Mongolian vowel separator
  0x180f, // Mongolian free variation selector-4 (Unicode 14)
  0x200b, // zero width space
  0x200c, // zero width non-joiner
  0x200d, // zero width joiner
  0x200e, 0x200f, // LRM, RLM
  0x202a, 0x202b, 0x202c, 0x202d, 0x202e, // LRE, RLE, PDF, LRO, RLO
  0x2060, // word joiner
  0x2061, 0x2062, 0x2063, 0x2064, // invisible math operators
  0x2066, 0x2067, 0x2068, 0x2069, // LRI, RLI, FSI, PDI
  ...range(0x206a, 0x2070), // deprecated format controls
  0xfeff, // BOM / ZWNBSP
  ...range(0xfe00, 0xfe10), // variation selectors
  0x3164, // Hangul filler (blank compatibility jamo)
  0xffa0, // halfwidth Hangul filler
  0xfff9, 0xfffa, 0xfffb, // interlinear annotation
]);

// Spaces that look like (or substitute for) U+0020.
export const SPACE_HOMOGLYPHS: ReadonlyMap<number, string> = new Map(
  [0x00a0, 0x1680, ...range(0x2000, 0x200b), 0x202f, 0x205f, 0x3000].map(
    (cp) => [cp, " "],
  ),
);

// Optional confusable Latin lookalikes (aggressive mode only).
export const LATIN_CONFUSABLES: ReadonlyMap<number, string> = new Map([
  // Cyrillic
  [0x0410, "A"], [0x0412, "B"], [0x0415, "E"], [0x041a, "K"], [0x041c, "M"],
  [0x041d, "H"], [0x041e, "O"], [0x0420, "P"], [0x0421, "C"], [0x0422, "T"],
  [0x0425, "X"], [0x0430, "a"], [0x0435, "e"], [0x043e, "o"], [0x0440, "p"],
  [0x0441, "c"], [0x0443, "y"], [0x0445, "x"], [0x0456, "i"],
  // Fullwidth A-Z, a-z
  ...range(0, 26).map((i): [number, string] => [0xff21 + i, String.fromCharCode(0x41 + i)]),
  ...range(0, 26).map((i): [number, string] => [0xff41 + i, String.fromCharCode(0x61 + i)]),
]);

// Variation selectors beyond FE0x (VS17-VS256).
export const isVsSupplement = (cp: number) => cp >= 0xe0100 && cp < 0xe01f0;

// Unassigned code points with Other_Default_Ignorable_Code_Point=Yes: they
// render invisibly and survive normalisation, so they make ideal covert
// carriers. Explicit ranges, never a category-Cn rule (see reference notes).
export const isReservedIgnorable = (cp: number) =>
  cp === 0x2065 ||
  cp === 0xe0000 ||
  (cp >= 0xfff0 && cp < 0xfff9) ||
  (cp >= 0xe0080 && cp < 0xe0100) ||
  (cp >= 0xe01f0 && cp < 0xe1000);

// The 66 Unicode noncharacters, prohibited in interchange text.
export const isNoncharacter = (cp: number) =>
  (cp >= 0xfdd0 && cp <= 0xfdef) || (cp & 0xfffe) === 0xfffe;

// Bidi / directional format controls (subset of strip set, finer inspect labels).
export const BIDI_CPS: ReadonlySet<number> = new Set([
  0x061c, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066,
  0x2067, 0x2068, 0x2069,
]);

// Marks and isolates are legitimate in mixed RTL/LTR prose: preserved by the
// default clean. Overrides and unpaired embeddings stay destructive.
export const PRESERVABLE_BIDI_CPS: ReadonlySet<number> = new Set([
  0x061c, 0x200e, 0x200f, 0x2066, 0x2067, 0x2068, 0x2069,
]);

// Visible-layout format controls (Egyptian hieroglyph quadrats, Duployan
// shorthand, musical beaming): kept next to their own script.
type Span = readonly [start: number, end: number]; // half-open
const LAYOUT_CF_CONTROLS: readonly (readonly [controls: Span, script: Span])[] = [
  [[0x13430, 0x13440], [0x13000, 0x14400]],
  [[0x1bca0, 0x1bca4], [0x1bc00, 0x1bca4]],
  [[0x1d173, 0x1d17b], [0x1d100, 0x1d200]],
];

export const inSpan = (cp: number, [start, end]: Span) => cp >= start && cp < end;

export function layoutCfScript(cp: number): Span | null {
  for (const [controls, script] of LAYOUT_CF_CONTROLS) {
    if (inSpan(cp, controls)) return script;
  }
  return null;
}

// Zero-width family (common edit-based carriers).
export const ZW_FAMILY: ReadonlySet<number> = new Set([
  0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0x180e,
]);

export const isPrivateUse = (cp: number) =>
  (cp >= 0xe000 && cp <= 0xf8ff) ||
  (cp >= 0xf0000 && cp <= 0xffffd) ||
  (cp >= 0x100000 && cp <= 0x10fffd);

// Emoji presentation glue: ZWJ and text/emoji variation selectors.
export const EMOJI_GLUE_CODEPOINTS: ReadonlySet<number> = new Set([0x200d, 0xfe0e, 0xfe0f]);

// Load-bearing invisibles that are only meaningful after a base from their
// own script (see reference _SCRIPT_JOINERS and friends).
export const SCRIPT_JOINERS: ReadonlySet<number> = new Set([0x200c, 0x200d]);
export const isTagRange = (cp: number) => cp >= 0xe0020 && cp < 0xe0080;
export const ORTHOGRAPHIC_CF: ReadonlySet<number> = new Set([
  0x0600, 0x0601, 0x0602, 0x0603, 0x0604, 0x0605, 0x06dd, 0x070f, 0x08e2,
  0x110bd, 0x110cd,
]);
export const MONGOLIAN_FVS: ReadonlySet<number> = new Set([0x180b, 0x180c, 0x180d, 0x180f]);
export const KHMER_VOWELS: ReadonlySet<number> = new Set([0x17b4, 0x17b5]);
export const HANGUL_FILLERS: ReadonlySet<number> = new Set([0x115f, 0x1160, 0x3164, 0xffa0]);
export const SCRIPT_GLUE: ReadonlySet<number> = new Set([
  ...MONGOLIAN_FVS,
  ...KHMER_VOWELS,
  ...HANGUL_FILLERS,
]);
