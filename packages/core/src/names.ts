import { NAME_TABLE } from "./unicode-names.generated";
import { isNoncharacter, isPrivateUse, isVsSupplement } from "./tables";

export const formatCodepoint = (cp: number) =>
  "U+" + cp.toString(16).toUpperCase().padStart(4, "0");

let table: Map<number, [category: string, name: string]> | null = null;

function lookup(cp: number): [string, string] | undefined {
  if (!table) {
    table = new Map();
    for (const row of NAME_TABLE.split("\n")) {
      const [hex, category, name] = row.split(";");
      table.set(parseInt(hex, 16), [category, name]);
    }
  }
  return table.get(cp);
}

const CATEGORY_TESTS: readonly [string, RegExp][] = [
  ["Cf", /^\p{Cf}$/u],
  ["Co", /^\p{Co}$/u],
  ["Cn", /^\p{Cn}$/u],
];

/** Label like Python's `f"U+{cp:04X} {unicodedata.name(ch)} ({category})"`. */
export function charLabel(ch: string): string {
  const cp = ch.codePointAt(0)!;
  let entry = lookup(cp);
  if (!entry && isVsSupplement(cp)) {
    entry = ["Mn", `VARIATION SELECTOR-${cp - 0xe0100 + 17}`];
  }
  if (!entry) {
    let category = "Cn";
    if (isPrivateUse(cp)) category = "Co";
    else if (!isNoncharacter(cp)) {
      category = CATEGORY_TESTS.find(([, re]) => re.test(ch))?.[0] ?? "Cn";
    }
    entry = [category, "UNKNOWN"];
  }
  return `${formatCodepoint(cp)} ${entry[1]} (${entry[0]})`;
}
