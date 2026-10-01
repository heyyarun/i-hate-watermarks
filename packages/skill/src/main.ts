import { readFileSync, writeFileSync } from "node:fs";
import { run } from "./cli";

const result = run(process.argv.slice(2), {
  readFile: (path) => readFileSync(path, "utf8"),
  readStdin: () => readFileSync(0, "utf8"),
  writeFile: (path, text) => writeFileSync(path, text, "utf8"),
});
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exitCode = result.code;
