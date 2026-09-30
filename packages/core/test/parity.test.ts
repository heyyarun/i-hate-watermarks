// Every case here was produced by the reference Python engine
// (scripts/gen-fixtures.py). The port must match it exactly.
import { describe, expect, it } from "vitest";
import fixtures from "./fixtures/parity.json";
import { cleanText, inspectText, type CleanOptions, type InspectOptions } from "../src";

type PyCleanOptions = {
  nfkc?: boolean;
  aggressive_homoglyphs?: boolean;
  normalize_spaces?: boolean;
  strip_emoji_glue?: boolean;
  strip_bidi?: boolean;
};

const toCleanOptions = (o: PyCleanOptions): CleanOptions => ({
  nfkc: o.nfkc,
  aggressiveHomoglyphs: o.aggressive_homoglyphs,
  normalizeSpaces: o.normalize_spaces,
  stripEmojiGlue: o.strip_emoji_glue,
  stripBidi: o.strip_bidi,
});

const toInspectOptions = (o: { aggressive?: boolean; strip_emoji_glue?: boolean }): InspectOptions => ({
  aggressive: o.aggressive,
  stripEmojiGlue: o.strip_emoji_glue,
});

const show = (s: string) =>
  Array.from(s, (c) => {
    const cp = c.codePointAt(0)!;
    return cp >= 0x20 && cp < 0x7f ? c : `\\u{${cp.toString(16)}}`;
  }).join("");

describe(`parity with Python engine (Unicode ${fixtures.unicode})`, () => {
  it.each(fixtures.cases.map((c) => [show(c.input), c] as const))("%s", (_, c) => {
    for (const expected of c.clean) {
      const actual = cleanText(c.input, toCleanOptions(expected.options));
      expect({ options: expected.options, ...actual }).toEqual({
        options: expected.options,
        text: expected.text,
        stats: expected.stats,
      });
    }
    for (const expected of c.inspect) {
      const { notes, ...report } = inspectText(c.input, toInspectOptions(expected.options));
      expect({ options: expected.options, ...report, notes: notes.length }).toEqual({
        options: expected.options,
        ...expected.report,
      });
    }
  });
});
