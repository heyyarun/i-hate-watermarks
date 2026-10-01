import { Fragment } from "react";
import { UNICODE_DATA_VERSION } from "@i-hate-watermarks/core";
import { Cleaner } from "@/components/cleaner";
import { CopyButton } from "@/components/copy-button";
import { Logo } from "@/components/logo";
import { site, skill } from "@/lib/site";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <nav className="flex items-center justify-between py-2 text-sm">
        <a href="/" className="flex min-h-11 items-center gap-2 font-medium tracking-tight">
          <Logo className="size-6" />
          {site.name}
        </a>
        <div className="flex items-center gap-3 sm:gap-4">
          <a
            href="https://offrun.dev"
            className="inline-flex min-h-11 items-center whitespace-nowrap text-xs text-muted transition-colors hover:text-ink active:text-ink"
          >
            <span className="hidden sm:inline">Built with&nbsp;</span>
            <span className="underline underline-offset-2">offrun.dev</span>
          </a>
          {skill && (
            <a
              href="#skill"
              className="flex min-h-11 items-center text-muted transition-colors hover:text-ink active:text-ink"
            >
              Skill
            </a>
          )}
          {site.repoUrl && (
            <a
              href={site.repoUrl}
              aria-label="GitHub repository"
              className="flex min-h-11 items-center gap-1.5 text-muted transition-colors hover:text-ink active:text-ink"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
                <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
              </svg>
              <span className="hidden sm:inline">GitHub</span>
            </a>
          )}
        </div>
      </nav>

      <header className="grid gap-8 pt-8 pb-8 sm:pt-12 md:grid-cols-[3fr_2fr] md:items-start lg:gap-12">
        <h1 className="max-w-3xl font-display text-4xl leading-[1.05] tracking-tight sm:text-7xl">
          Your AI text has <em className="text-strip">invisible</em> characters in it.
        </h1>
        <p className="max-w-md text-lg text-muted md:pt-2 md:text-base">
          Paste it here to see every hidden character, including zero-width spaces, tag characters
          that spell out secret messages, and lookalike spaces. Then copy a clean version. It all
          runs in your browser, so your text never leaves this page.
        </p>
      </header>

      <main>
        <Cleaner />

        <section id="limits" className="grid gap-10 border-t border-line py-16 md:grid-cols-[1fr_2fr]">
          <h2 className="font-display text-4xl leading-tight">What this can and can’t remove</h2>
          <div className="space-y-6 text-muted">
            <div>
              <h3 className="font-semibold text-ink">It removes: characters you can’t see</h3>
              <p className="mt-1">
                Zero-width spaces and joiners, byte-order marks, soft hyphens, text-direction
                overrides, variation selectors, Unicode tag characters, private-use and
                reserved code points, and exotic spaces. These are the marks people add by
                editing the text, and the ones that come along when you copy and paste.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink">It keeps: invisible characters your text needs</h3>
              <p className="mt-1">
                The joiner inside ❤️‍🔥, joiners inside Persian and Indic words, complete flag
                sequences, right-to-left marks in Arabic and Hebrew, and similar. Removing them
                would visibly break the text, so they stay unless you turn on the options that
                strip them.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink">It can’t touch: statistical watermarks</h3>
              <p className="mt-1">
                Some AI providers, such as Google with SynthID-Text, watermark text by nudging
                which words the model picks. Those watermarks live in the wording itself, not in
                any character, so no character filter can find or remove them. Only rewriting
                the text weakens them. Any tool that says it removes “all” AI watermarks from
                pasted text is overstating what it does.
              </p>
            </div>
            <p className="text-sm">
              Removing hidden characters doesn’t change who wrote the text. Follow the rules of
              your school, employer or publisher about disclosing AI use.
            </p>
          </div>
        </section>

        <section id="use-it" className="grid gap-10 border-t border-line py-16 md:grid-cols-[1fr_2fr]">
          <h2 className="font-display text-4xl leading-tight">Use it anywhere</h2>
          <div className="grid min-w-0 grid-cols-1 gap-4">
            {skill && (
              <div id="skill" className="panel scroll-mt-6 p-5">
                <h3 className="font-semibold">Agent skill for Claude Code, Codex and more</h3>
                <p className="mt-1 text-sm text-muted">
                  Let your coding agent find and remove hidden characters in files, pasted text and
                  its own output. Same engine and rules as this page. It runs offline with Node,
                  no packages needed.
                </p>
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-line bg-paper/60 py-1.5 pr-1.5 pl-4">
                  <code className="min-w-0 flex-1 py-1 font-mono text-xs sm:text-sm">
                    <span className="text-muted select-none">$ </span>
                    {/* Wrap only between words: a break at the hyphen in the repo name looks like part of the command. */}
                    {skill.installCommand.split(" ").map((word, i) => (
                      <Fragment key={i}>
                        {i > 0 && " "}
                        <span className="whitespace-nowrap">{word}</span>
                      </Fragment>
                    ))}
                  </code>
                  <CopyButton text={skill.installCommand} className="btn-ghost shrink-0" />
                </div>
                <p className="mt-3 text-sm text-muted">
                  Tested in Claude Code and Codex. The installer also supports Cursor, Gemini CLI,
                  GitHub Copilot and other agents. To install by hand, copy the{" "}
                  <a href={skill.folderUrl} className="underline underline-offset-2 hover:text-ink">
                    {site.skillName}
                  </a>{" "}
                  folder into <code className="font-mono text-xs">~/.claude/skills</code> or{" "}
                  <code className="font-mono text-xs">~/.agents/skills</code>.
                </p>
              </div>
            )}
            <div className="panel p-5">
              <h3 className="font-semibold">Open source</h3>
              <p className="mt-1 text-sm text-muted">
                MIT licensed. The cleaning engine is a small TypeScript library with no
                dependencies, tested against the original Python implementation.
              </p>
              {site.repoUrl ? (
                <a href={site.repoUrl} className="btn-primary mt-4 inline-block">
                  View on GitHub
                </a>
              ) : (
                <p className="mt-4 text-sm font-medium">Repository coming soon</p>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 border-t border-line py-8 text-sm text-muted sm:flex-row sm:justify-between">
        <div className="space-y-1">
          <p>
            Built with{" "}
            <a href="https://offrun.dev" className="underline underline-offset-2 hover:text-ink">
              offrun.dev
            </a>
            .
          </p>
          <p>
            Based on{" "}
            <a href={site.referenceUrl} className="underline underline-offset-2 hover:text-ink">
              watermarks-remover
            </a>{" "}
            by Guillaume Meyer (MIT).
          </p>
        </div>
        <p>Your text stays in your browser. Unicode {UNICODE_DATA_VERSION} character data.</p>
      </footer>
    </div>
  );
}
