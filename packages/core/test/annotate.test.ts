import { describe, expect, it } from "vitest";
import { annotate, cleanText } from "../src";

const marks = (text: string, opts = {}) =>
  annotate(text, opts).flatMap((s) => (s.type === "mark" ? [s] : []));

describe("annotate", () => {
  it("round-trips the input text", () => {
    const text = "Hi​ 👨‍👩‍👧 \u{e0041}x y";
    const joined = annotate(text)
      .map((s) => (s.type === "text" ? s.text : s.char))
      .join("");
    expect(joined).toBe(text);
  });

  it("reports UTF-16 offsets", () => {
    const text = "😀​😀\u{e0041}";
    const [zwsp, tag] = marks(text);
    expect(text.slice(zwsp.offset, zwsp.offset + 1)).toBe("​");
    expect(zwsp).toMatchObject({ action: "strip", kind: "zwj_family" });
    expect(tag).toMatchObject({ offset: 5, action: "strip", kind: "tag_chars" });
  });

  it("flags load-bearing characters as kept", () => {
    expect(marks("السعر ⁦123 USD⁩")).toEqual([
      expect.objectContaining({ codepoint: 0x2066, action: "keep", kind: "bidi" }),
      expect.objectContaining({ codepoint: 0x2069, action: "keep", kind: "bidi" }),
    ]);
    // Emoji glue is not suspicious at all, so it is not flagged.
    expect(marks("❤️‍🔥")).toEqual([]);
  });

  it("shows replacements and matches cleanText", () => {
    const text = "a b pаy​";
    const opts = { aggressiveHomoglyphs: true };
    const rebuilt = annotate(text, opts)
      .map((s) => (s.type === "text" ? s.text : s.action === "keep" ? s.char : s.replacement))
      .join("");
    expect(rebuilt).toBe(cleanText(text, opts).text);
    expect(marks(text, opts).map((m) => m.kind)).toEqual(["space", "confusable", "zwj_family"]);
  });

  it("flags exotic spaces as kept when normalizeSpaces is off", () => {
    expect(marks("a b", { normalizeSpaces: false })).toEqual([
      expect.objectContaining({ action: "keep", kind: "space" }),
    ]);
  });
});
