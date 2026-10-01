import { describe, expect, it } from "vitest";
import fixtures from "../../core/test/fixtures/parity.json";
import { run, type Io } from "../src/cli";

type PyCleanOptions = {
  nfkc?: boolean;
  aggressive_homoglyphs?: boolean;
  normalize_spaces?: boolean;
  strip_emoji_glue?: boolean;
  strip_bidi?: boolean;
};

const cleanFlags = (o: PyCleanOptions) => [
  ...(o.nfkc ? ["--nfkc"] : []),
  ...(o.aggressive_homoglyphs ? ["--aggressive-homoglyphs"] : []),
  ...(o.normalize_spaces === false ? ["--keep-spaces"] : []),
  ...(o.strip_emoji_glue ? ["--strip-emoji-glue"] : []),
  ...(o.strip_bidi ? ["--strip-bidi"] : []),
];

const inspectFlags = (o: { aggressive?: boolean; strip_emoji_glue?: boolean }) => [
  ...(o.aggressive ? ["--aggressive-homoglyphs"] : []),
  ...(o.strip_emoji_glue ? ["--strip-emoji-glue"] : []),
];

function memoryIo(files: Record<string, string> = {}, stdin = "") {
  const writes: string[] = [];
  const io: Io = {
    readFile: (path) => {
      if (!(path in files)) throw new Error("ENOENT: no such file");
      return files[path];
    },
    readStdin: () => stdin,
    writeFile: (path, text) => {
      writes.push(path);
      files[path] = text;
    },
  };
  return { io, files, writes };
}

describe("CLI matches the Python engine on every parity fixture", () => {
  it.each(fixtures.cases.map((c, i) => [i, c] as const))("case %i", (_, c) => {
    for (const expected of c.clean) {
      const { io } = memoryIo({}, c.input);
      const r = run(["clean", "--json", ...cleanFlags(expected.options)], io);
      expect(r.code).toBe(0);
      const out = JSON.parse(r.stdout);
      expect({ text: out.text, stats: out.stats }).toEqual({ text: expected.text, stats: expected.stats });
    }
    for (const expected of c.inspect) {
      const { io } = memoryIo({}, c.input);
      const r = run(["inspect", "--json", ...inspectFlags(expected.options)], io);
      const { notes, findings: _f, hidden_messages: _m, ...report } = JSON.parse(r.stdout);
      expect({ ...report, notes: notes.length }).toEqual(expected.report);
    }
  });
});

const SAMPLE = "Hello​World ok\n\u{E0048}\u{E0069}\u{E0021} 👨‍👩‍👧";

describe("inspect", () => {
  it("lists findings with line:column positions and decodes tag messages", () => {
    const { io } = memoryIo({ "a.txt": SAMPLE });
    const r = run(["inspect", "a.txt"], io);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Hidden characters: 4 to remove, 1 to replace, 0 to keep.");
    expect(r.stdout).toContain("1 × U+200B ZERO WIDTH SPACE (Cf): remove (at 1:6)");
    expect(r.stdout).toContain("3 × Unicode tag characters (invisible copies of ASCII): remove (at 2:1, 2:2, 2:3)");
    expect(r.stdout).toContain('Hidden message spelled in tag characters: "Hi!"');
    expect(r.stdout).toContain("SynthID-Text");
  });

  it("says so when the text is clean", () => {
    const { io } = memoryIo({}, "Plain text 👨‍👩‍👧");
    expect(run(["inspect"], io).stdout).toMatch(/^No hidden characters found\./);
  });

  it("refuses to write files", () => {
    const { io } = memoryIo({ "a.txt": SAMPLE });
    expect(run(["inspect", "a.txt", "--in-place"], io).code).toBe(2);
  });
});

describe("clean", () => {
  it("prints cleaned text to stdout and the summary to stderr, keeping emoji joiners", () => {
    const { io } = memoryIo({}, SAMPLE);
    const r = run(["clean"], io);
    expect(r.stdout).toBe("HelloWorld ok\n 👨‍👩‍👧");
    expect(r.stderr).toContain("Hidden characters: 4 removed, 1 replaced, 0 kept.");
  });

  it("rewrites a file in place", () => {
    const { io, files } = memoryIo({ "a.txt": SAMPLE });
    const r = run(["clean", "-i", "a.txt"], io);
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain("Wrote cleaned text to a.txt.");
    expect(files["a.txt"]).toBe("HelloWorld ok\n 👨‍👩‍👧");
  });

  it("does not touch a file that is already clean", () => {
    const { io, writes } = memoryIo({ "a.txt": "already clean" });
    run(["clean", "--in-place", "a.txt"], io);
    expect(writes).toEqual([]);
  });

  it("writes to --output and reports it in JSON without the text", () => {
    const { io, files } = memoryIo({ "a.txt": SAMPLE });
    const out = JSON.parse(run(["clean", "a.txt", "-o", "b.txt", "--json"], io).stdout);
    expect(files["b.txt"]).toBe("HelloWorld ok\n 👨‍👩‍👧");
    expect(out).toMatchObject({ written_to: "b.txt", changed: true, hidden_messages: ["Hi!"] });
    expect(out).not.toHaveProperty("text");
  });

  it("applies cleaning options", () => {
    const { io } = memoryIo({}, "a b 👨‍👩‍👧");
    expect(run(["clean", "--keep-spaces", "--strip-emoji-glue"], io).stdout).toBe("a b 👨👩👧");
  });
});

describe("errors", () => {
  it.each([
    [["clean", "--frobnicate"], 'Unknown option "--frobnicate"'],
    [["scrub"], 'Unknown command "scrub"'],
    [["clean", "--in-place"], "--in-place needs a FILE"],
    [["clean", "a", "b"], "Only one FILE"],
    [["clean", "-o"], "-o needs a path"],
  ])("%j exits 2 with usage", (argv, message) => {
    const r = run(argv, memoryIo({ a: "" }).io);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain(message);
    expect(r.stderr).toContain("Usage:");
  });

  it("reports a missing file with exit 1", () => {
    const r = run(["clean", "missing.txt"], memoryIo().io);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("Cannot read missing.txt");
  });

  it("prints help", () => {
    expect(run(["--help"], memoryIo().io)).toMatchObject({ code: 0, stdout: expect.stringContaining("Usage:") });
  });
});
