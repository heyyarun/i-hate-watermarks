// Minimal port of Python's difflib.SequenceMatcher(None, a, b, autojunk=False),
// enough to count input code points touched by NFKC exactly like the
// reference engine: sum of (i2 - i1) over non-equal opcodes, which equals
// len(a) minus the total size of the matching blocks.

type Block = [i: number, j: number, size: number];

function matchingBlocks(a: readonly string[], b: readonly string[]): Block[] {
  const b2j = new Map<string, number[]>();
  b.forEach((elt, j) => {
    const list = b2j.get(elt);
    if (list) list.push(j);
    else b2j.set(elt, [j]);
  });

  const findLongestMatch = (alo: number, ahi: number, blo: number, bhi: number): Block => {
    let besti = alo;
    let bestj = blo;
    let bestsize = 0;
    let j2len = new Map<number, number>();
    for (let i = alo; i < ahi; i++) {
      const newj2len = new Map<number, number>();
      for (const j of b2j.get(a[i]) ?? []) {
        if (j < blo) continue;
        if (j >= bhi) break;
        const k = (j2len.get(j - 1) ?? 0) + 1;
        newj2len.set(j, k);
        if (k > bestsize) {
          besti = i - k + 1;
          bestj = j - k + 1;
          bestsize = k;
        }
      }
      j2len = newj2len;
    }
    // No junk, so only the "extend with equal elements" passes that Python
    // runs for junk are no-ops; the result is the same.
    return [besti, bestj, bestsize];
  };

  const blocks: Block[] = [];
  const queue: [number, number, number, number][] = [[0, a.length, 0, b.length]];
  while (queue.length) {
    const [alo, ahi, blo, bhi] = queue.pop()!;
    const [i, j, k] = findLongestMatch(alo, ahi, blo, bhi);
    if (k) {
      blocks.push([i, j, k]);
      if (alo < i && blo < j) queue.push([alo, i, blo, j]);
      if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
    }
  }
  return blocks;
}

/** Number of code points of `before` that are not part of an equal run in `after`. */
export function changedInputCount(before: string, after: string): number {
  const a = Array.from(before);
  const b = Array.from(after);
  const matched = matchingBlocks(a, b).reduce((n, [, , size]) => n + size, 0);
  return a.length - matched;
}
