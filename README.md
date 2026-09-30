# I Hate Watermarks

Paste AI-generated text, see the invisible characters hidden in it, and copy a clean version.
The cleaner runs entirely in the browser, so pasted text never leaves the page. The site is a
static export and uses Google Analytics to measure page visits.

It removes **invisible-character watermarks**: zero-width spaces and joiners, BOMs, soft hyphens,
bidi overrides, variation selectors, Unicode tag characters (which can spell out hidden
messages), private-use/noncharacter/reserved code points and exotic spaces. It keeps the
invisible characters real text needs (emoji ZWJ sequences, Persian/Indic joiners, flag tag
sequences, RTL marks).

It **cannot** remove statistical watermarks such as SynthID-Text, which live in word choice
rather than in any character.

## Layout

- `packages/core`: the cleaning engine (TypeScript, no dependencies). Port of
  [watermarks-remover](https://github.com/guillaumemeyer/watermarks-remover)'s Layer A engine.
- `apps/web`: the Next.js site (`output: "export"`).

## Develop

Uses pnpm through corepack (bundled with Node), so pnpm does not need to be on your PATH.
If it is, plain `pnpm <script>` works too.

```sh
corepack pnpm install
corepack pnpm dev          # http://localhost:3000
corepack pnpm test         # engine tests, incl. parity with the Python original
corepack pnpm typecheck    # works from a clean checkout; generates Next route types first
corepack pnpm build        # static site in apps/web/out
```

### Regenerating data

Both scripts need [uv](https://docs.astral.sh/uv/). Fixtures also need a checkout of the reference repo.

```sh
cd packages/core
corepack pnpm gen:names                                   # src/unicode-names.generated.ts
corepack pnpm gen:fixtures /path/to/watermarks-remover    # test/fixtures/parity.json
```

## License

MIT. See `LICENSE` and `NOTICE`.
