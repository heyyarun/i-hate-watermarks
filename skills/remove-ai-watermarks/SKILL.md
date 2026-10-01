---
name: remove-ai-watermarks
description: Find and remove invisible Unicode watermarks and hidden characters (zero-width spaces and joiners, BOMs, soft hyphens, bidi overrides, variation selectors, Unicode tag characters that spell hidden messages, private-use code points, lookalike spaces) from AI-generated or pasted text, files, or your own output. Use when the user asks to strip, clean, detect or check for AI watermarks, hidden or invisible characters, zero-width characters, or "weird characters" in text. Does not remove statistical watermarks such as SynthID-Text.
license: MIT
compatibility: Requires Node.js 18 or newer. No network access or packages needed.
metadata:
  homepage: https://github.com/heyyarun/i-hate-watermarks
---

# Remove AI watermarks

`scripts/watermarks.mjs`, in the folder that holds this file (`<skill-dir>` below), is a
self-contained Node script with the same engine as the I Hate Watermarks website (https://www.ihatewatermark.co). It runs
offline and needs no packages.

```sh
node <skill-dir>/scripts/watermarks.mjs inspect FILE         # report only, changes nothing
node <skill-dir>/scripts/watermarks.mjs clean FILE           # cleaned text to stdout
node <skill-dir>/scripts/watermarks.mjs clean -i FILE        # overwrite FILE
node <skill-dir>/scripts/watermarks.mjs clean FILE -o OUT    # write to OUT
```

Omit FILE (or pass `-`) to read stdin. Add `--json` for structured output. The summary
goes to stderr when the cleaned text goes to stdout, so `> out.txt` captures only the text.

## Workflow

1. **Get the text into a file or stdin.** For text pasted into the chat, write it to a temp
   file with your file-writing tool exactly as given. Do not retype it or pass it through a
   shell string or heredoc you typed: the characters you are looking for are invisible, and
   retyping loses or adds them.
2. **Inspect first** with `inspect`. It lists each kind of hidden character, how many, where
   (`line:column`) and what cleaning will do with it (remove, replace, or keep).
3. **Clean.** For a file the user named, use `clean -i FILE` only if they asked to change it;
   otherwise write to a new file or show the result. For pasted text, run `clean` and give
   the user the cleaned text, or the path of the cleaned file if it is long.
4. **Report** in a few lines: what was found and removed, any hidden message decoded from tag
   characters (quote it), and anything kept on purpose.

Run on many files with a loop or `find ... -exec`, inspecting first.

## What it keeps on purpose

By default it keeps invisible characters that real text needs: joiners inside emoji like 👨‍👩‍👧,
joiners in Persian and Indic words, complete flag tag sequences, right-to-left marks in
Arabic and Hebrew, and similar. Removing them visibly breaks the text. Only if the user asks,
add:

- `--strip-emoji-glue` to also remove emoji and script joiners
- `--strip-bidi` to also remove direction marks and isolates
- `--keep-spaces` to leave non-breaking and other exotic spaces alone (by default they become
  normal spaces)
- `--aggressive-homoglyphs` to replace Cyrillic and fullwidth lookalike letters with ASCII
- `--nfkc` to apply Unicode NFKC normalization

## Limits to tell the user

- It removes **invisible-character** watermarks only. **Statistical watermarks** (for example
  Google's SynthID-Text) live in word choice, not in any character. No character filter
  detects or removes them. Never claim the text is now free of all AI watermarks.
- Removing hidden characters does not change who wrote the text.
- Source code and data files can contain intentional invisible characters (BOMs, NBSP in
  templates, RTL marks in translations). Inspect and ask before cleaning those in place.
