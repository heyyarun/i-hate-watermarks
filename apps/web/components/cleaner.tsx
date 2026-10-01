"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  annotate,
  cleanText,
  hiddenTagMessages,
  type CleanOptions,
  type HitKind,
} from "@i-hate-watermarks/core";
import { AnnotatedView } from "./annotated-view";
import { CopyButton } from "./copy-button";
import { KIND_LABELS } from "@/lib/describe";
import { SAMPLE_TEXT } from "@/lib/sample";

type OptionKey = keyof Required<CleanOptions>;

const OPTIONS: { key: OptionKey; label: string; hint: string }[] = [
  {
    key: "normalizeSpaces",
    label: "Normalize lookalike spaces",
    hint: "No-break, em, thin and other exotic spaces become a normal space. Turn off for French typography.",
  },
  {
    key: "aggressiveHomoglyphs",
    label: "Replace lookalike letters",
    hint: "Cyrillic and fullwidth letters that look like Latin ones (а → a). Off by default: breaks real Russian text.",
  },
  {
    key: "nfkc",
    label: "NFKC normalization",
    hint: "Folds compatibility forms: ligatures (ﬃ → ffi), fullwidth, superscripts. Not shown in the highlights.",
  },
  {
    key: "stripEmojiGlue",
    label: "Also strip emoji & script joiners",
    hint: "Removes joiners that emoji (❤️‍🔥), Persian and Indic words need. Will visibly change such text.",
  },
  {
    key: "stripBidi",
    label: "Also strip direction marks",
    hint: "Removes RTL/LTR marks and isolates that Arabic and Hebrew text may rely on.",
  },
];

const DEFAULTS: Required<CleanOptions> = {
  normalizeSpaces: true,
  aggressiveHomoglyphs: false,
  nfkc: false,
  stripEmojiGlue: false,
  stripBidi: false,
};

export function Cleaner() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState(DEFAULTS);
  const deferredInput = useDeferredValue(input);
  const deferredOptions = useDeferredValue(options);
  const stale = deferredInput !== input || deferredOptions !== options;

  const { result, segments, byKind, kept, marks, messages } = useMemo(() => {
    const result = cleanText(deferredInput, deferredOptions);
    const segments = annotate(deferredInput, deferredOptions);
    const byKind = new Map<HitKind, number>();
    let kept = 0;
    let marks = 0;
    for (const s of segments) {
      if (s.type !== "mark") continue;
      marks++;
      if (s.action === "keep") kept++;
      else byKind.set(s.kind, (byKind.get(s.kind) ?? 0) + 1);
    }
    return { result, segments, byKind, kept, marks, messages: hiddenTagMessages(segments) };
  }, [deferredInput, deferredOptions]);

  const { removed_count: removed, replaced_count: replaced } = result.stats;
  const changed = result.text !== deferredInput;

  async function pasteFromClipboard() {
    try {
      setInput(await navigator.clipboard.readText());
    } catch {
      // Permission denied or unsupported: the textarea still accepts Ctrl/Cmd+V.
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([result.text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "cleaned.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel flex min-w-0 flex-col" aria-labelledby="input-heading">
          <header className="panel-header flex-wrap">
            <h2 id="input-heading" className="panel-title">
              1. Paste text
            </h2>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={pasteFromClipboard}>
                Paste
              </button>
              <button type="button" className="btn-ghost" onClick={() => setInput(SAMPLE_TEXT)}>
                Try a sample
              </button>
              {input && (
                <button type="button" className="btn-ghost" onClick={() => setInput("")}>
                  Clear
                </button>
              )}
            </div>
          </header>
          <textarea
            className="editor"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste text from ChatGPT, Claude, Gemini or anywhere else…"
            spellCheck={false}
            aria-label="Text to clean"
          />
        </section>

        <section className="panel flex min-w-0 flex-col" aria-labelledby="output-heading">
          <header className="panel-header flex-wrap">
            <h2 id="output-heading" className="panel-title">
              2. Copy the clean version
            </h2>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={download} disabled={!result.text}>
                Download .txt
              </button>
              <CopyButton text={result.text} />
            </div>
          </header>
          <textarea
            className={`editor ${stale ? "opacity-60" : ""}`}
            value={result.text}
            readOnly
            placeholder="The cleaned text appears here."
            spellCheck={false}
            aria-label="Cleaned text"
          />
        </section>
      </div>

      <section className="panel" aria-labelledby="findings-heading" aria-live="polite">
        <header className="panel-header flex-wrap">
          <h2 id="findings-heading" className="panel-title">
            What was hidden in it
          </h2>
          <p className="text-sm text-muted">
            {!deferredInput ? (
              "Paste something to see its invisible characters."
            ) : !changed && marks === 0 ? (
              "Nothing hidden found. This text has no invisible-character watermarks."
            ) : (
              <>
                <strong className="text-strip">{removed}</strong> removed ·{" "}
                <strong className="text-replace">{replaced}</strong> replaced
                {kept > 0 && (
                  <>
                    {" "}
                    · <strong className="text-keep">{kept}</strong> flagged but kept
                  </>
                )}
              </>
            )}
          </p>
        </header>

        {byKind.size > 0 && (
          <ul className="flex flex-wrap gap-2 px-5 pt-4" aria-label="Findings by type">
            {[...byKind].map(([kind, count]) => (
              <li key={kind} className="chip">
                {KIND_LABELS[kind]} <span className="font-mono tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        )}

        {messages.length > 0 && (
          <div className="mx-5 mt-4 rounded-lg border border-strip/40 bg-strip/5 px-4 py-3 text-sm">
            <p className="font-medium">Hidden message found in invisible tag characters:</p>
            {messages.map((m, i) => (
              <p key={i} className="mt-1 font-mono break-all">
                “{m}”
              </p>
            ))}
          </div>
        )}

        <AnnotatedView segments={segments} />

        <fieldset className="border-t border-line px-5 py-4">
          <legend className="sr-only">Cleaning options</legend>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {OPTIONS.map(({ key, label, hint }) => (
              <label key={key} className="flex cursor-pointer gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-ink"
                  checked={options[key]}
                  onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
                />
                <span>
                  <span className="font-medium">{label}</span>
                  <span className="block text-muted">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>
    </div>
  );
}
