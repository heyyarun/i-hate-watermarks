// Command-line front end for the agent skill. Kept free of Node APIs so the
// tests can drive it in-process; main.ts wires it to the real process.

import {
  annotate,
  cleanText,
  hiddenTagMessages,
  inspectText,
  type CleanOptions,
  type Segment,
} from "@i-hate-watermarks/core";

export interface Io {
  readFile(path: string): string;
  readStdin(): string;
  writeFile(path: string, text: string): void;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  code: number;
}

export const USAGE = `Usage:
  watermarks.mjs inspect [FILE] [options]   Report hidden characters (text is not changed)
  watermarks.mjs clean [FILE] [options]     Print the cleaned text to stdout

FILE is a path, or "-" / omitted to read stdin.

Output:
  -o, --output PATH          clean: write the cleaned text to PATH instead of stdout
  -i, --in-place             clean: overwrite FILE with the cleaned text
  --json                     Machine-readable output

Cleaning options (same as the website):
  --keep-spaces              Keep exotic spaces (NBSP, em space, ...) instead of using U+0020
  --aggressive-homoglyphs    Also replace Cyrillic and fullwidth Latin lookalikes with ASCII
  --nfkc                     Apply Unicode NFKC normalization after cleaning
  --strip-emoji-glue         Also strip joiners emoji and Persian/Indic words need
  --strip-bidi               Also strip right-to-left marks and isolates

Removes invisible-character watermarks only. Statistical watermarks such as
SynthID-Text live in word choice and cannot be detected or removed here.`;

const FLAGS: Record<string, keyof CleanOptions | "keepSpaces"> = {
  "--keep-spaces": "keepSpaces",
  "--aggressive-homoglyphs": "aggressiveHomoglyphs",
  "--nfkc": "nfkc",
  "--strip-emoji-glue": "stripEmojiGlue",
  "--strip-bidi": "stripBidi",
};

interface Args {
  command: "inspect" | "clean";
  file: string | null;
  output: string | null;
  inPlace: boolean;
  json: boolean;
  options: CleanOptions;
}

class UsageError extends Error {}

function parseArgs(argv: string[]): Args {
  const [command, ...rest] = argv;
  if (command !== "inspect" && command !== "clean") {
    throw new UsageError(command ? `Unknown command "${command}".` : "Missing command.");
  }
  const args: Args = { command, file: null, output: null, inPlace: false, json: false, options: {} };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--json") args.json = true;
    else if (a === "-i" || a === "--in-place") args.inPlace = true;
    else if (a === "-o" || a === "--output") {
      const path = rest[++i];
      if (!path) throw new UsageError(`${a} needs a path.`);
      args.output = path;
    } else if (a in FLAGS) {
      const key = FLAGS[a];
      if (key === "keepSpaces") args.options.normalizeSpaces = false;
      else args.options[key] = true;
    } else if (a.startsWith("-") && a !== "-") {
      throw new UsageError(`Unknown option "${a}".`);
    } else if (args.file === null) {
      args.file = a;
    } else {
      throw new UsageError(`Only one FILE is accepted, got "${args.file}" and "${a}".`);
    }
  }
  if (args.command === "inspect" && (args.output || args.inPlace)) {
    throw new UsageError("inspect does not write files; use clean.");
  }
  if (args.inPlace && (args.file === null || args.file === "-")) {
    throw new UsageError("--in-place needs a FILE.");
  }
  if (args.inPlace && args.output) throw new UsageError("Use either --in-place or --output.");
  return args;
}

type Mark = Extract<Segment, { type: "mark" }>;

interface Finding {
  codepoint: string;
  label: string;
  kind: Mark["kind"];
  action: Mark["action"];
  replacement: string;
  count: number;
  /** 1-based "line:column" of the first few occurrences, columns in code points. */
  positions: string[];
}

const MAX_POSITIONS = 5;

/** Group flagged characters by what cleaning does with them, like the website does. */
function findings(text: string, segments: Segment[]): Finding[] {
  const groups = new Map<string, Finding>();
  let line = 1;
  let col = 1;
  for (const s of segments) {
    if (s.type === "mark") {
      // A hidden tag message is one finding, not one line per letter.
      const tags = s.kind === "tag_chars" && s.action === "strip";
      const key = tags ? "tags" : `${s.codepoint}:${s.action}:${s.replacement}`;
      let f = groups.get(key);
      if (!f) {
        f = {
          codepoint: tags ? "U+E0000..U+E007F" : `U+${s.codepoint.toString(16).toUpperCase().padStart(4, "0")}`,
          label: tags ? "Unicode tag characters (invisible copies of ASCII)" : s.label,
          kind: s.kind,
          action: s.action,
          replacement: s.replacement,
          count: 0,
          positions: [],
        };
        groups.set(key, f);
      }
      f.count++;
      if (f.positions.length < MAX_POSITIONS) f.positions.push(`${line}:${col}`);
    }
    for (const ch of s.type === "mark" ? s.char : s.text) {
      if (ch === "\n") {
        line++;
        col = 1;
      } else col++;
    }
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.codepoint.localeCompare(b.codepoint));
}

const ACTION_TEXT = {
  strip: () => "remove",
  replace: (f: Finding) => `replace with ${f.replacement === " " ? "a normal space" : JSON.stringify(f.replacement)}`,
  keep: () => "keep, the text needs it (see --strip-emoji-glue / --strip-bidi)",
};

function summary(found: Finding[], messages: string[], done: boolean): string {
  const removed = found.filter((f) => f.action === "strip").reduce((n, f) => n + f.count, 0);
  const replaced = found.filter((f) => f.action === "replace").reduce((n, f) => n + f.count, 0);
  const kept = found.filter((f) => f.action === "keep").reduce((n, f) => n + f.count, 0);
  if (found.length === 0) return "No hidden characters found.";
  const lines = [
    done
      ? `Hidden characters: ${removed} removed, ${replaced} replaced, ${kept} kept.`
      : `Hidden characters: ${removed} to remove, ${replaced} to replace, ${kept} to keep.`,
    ...found.map(
      (f) =>
        `  ${String(f.count).padStart(5)} × ${f.label}: ${ACTION_TEXT[f.action](f)} (at ${f.positions.join(", ")}${f.count > f.positions.length ? ", ..." : ""})`,
    ),
  ];
  for (const m of messages) lines.push(`Hidden message spelled in tag characters: ${JSON.stringify(m)}`);
  return lines.join("\n");
}

const NOTE =
  "Note: only invisible-character watermarks are handled. Statistical watermarks (e.g. SynthID-Text) live in word choice and are not detected.";

export function run(argv: string[], io: Io): RunResult {
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help" || argv[0] === "help") {
    return { stdout: USAGE + "\n", stderr: "", code: argv.length === 0 ? 2 : 0 };
  }
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    if (e instanceof UsageError) return { stdout: "", stderr: `${e.message}\n\n${USAGE}\n`, code: 2 };
    throw e;
  }

  let text: string;
  try {
    text = args.file === null || args.file === "-" ? io.readStdin() : io.readFile(args.file);
  } catch (e) {
    return { stdout: "", stderr: `Cannot read ${args.file ?? "stdin"}: ${(e as Error).message}\n`, code: 1 };
  }

  const segments = annotate(text, args.options);
  const found = findings(text, segments);
  const messages = hiddenTagMessages(segments);

  if (args.command === "inspect") {
    if (args.json) {
      const report = inspectText(text, {
        aggressive: args.options.aggressiveHomoglyphs,
        stripEmojiGlue: args.options.stripEmojiGlue,
      });
      const json = { ...report, findings: found, hidden_messages: messages };
      return { stdout: JSON.stringify(json, null, 2) + "\n", stderr: "", code: 0 };
    }
    return { stdout: `${summary(found, messages, false)}\n${NOTE}\n`, stderr: "", code: 0 };
  }

  const result = cleanText(text, args.options);
  const target = args.inPlace ? args.file : args.output;
  if (target) {
    // Leave an unchanged file alone so mtimes and editors are not disturbed.
    if (!(args.inPlace && result.text === text)) {
      try {
        io.writeFile(target, result.text);
      } catch (e) {
        return { stdout: "", stderr: `Cannot write ${target}: ${(e as Error).message}\n`, code: 1 };
      }
    }
  }

  if (args.json) {
    const json = {
      ...(target ? { written_to: target } : { text: result.text }),
      changed: result.text !== text,
      stats: result.stats,
      findings: found,
      hidden_messages: messages,
    };
    return { stdout: JSON.stringify(json, null, 2) + "\n", stderr: "", code: 0 };
  }

  const where = target ? `Wrote cleaned text to ${target}.\n` : "";
  return {
    stdout: target ? "" : result.text,
    stderr: `${where}${summary(found, messages, true)}\n`,
    code: 0,
  };
}
