// The skill ships a prebuilt script, so check that the committed file is what
// the current sources build to, and that it runs as a real Node process.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS build script without types
import { OUTFILE, bundle } from "../build.mjs";

describe("skills/remove-ai-watermarks/scripts/watermarks.mjs", () => {
  it("is up to date with the sources (run `corepack pnpm --filter @i-hate-watermarks/skill build`)", async () => {
    expect(readFileSync(OUTFILE, "utf8") === (await bundle())).toBe(true);
  });

  it("is executable", () => {
    expect(statSync(OUTFILE).mode & 0o111).not.toBe(0);
  });

  it("cleans stdin as a standalone process", () => {
    const out = execFileSync("node", [OUTFILE, "clean"], {
      input: "Hi​ there\u{E0041}",
      stdio: ["pipe", "pipe", "pipe"],
    });
    expect(out.toString()).toBe("Hi there");
  });

  it("cleans a file in place", () => {
    const file = join(mkdtempSync(join(tmpdir(), "watermarks-")), "draft.md");
    writeFileSync(file, "# Title\n\nBody‍ text­.\n");
    execFileSync("node", [OUTFILE, "clean", "--in-place", file], { stdio: "pipe" });
    expect(readFileSync(file, "utf8")).toBe("# Title\n\nBody text.\n");
  });
});
