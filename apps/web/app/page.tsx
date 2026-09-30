import { UNICODE_DATA_VERSION } from "@i-hate-watermarks/core";
import { Cleaner } from "@/components/cleaner";
import { site } from "@/lib/site";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <nav className="flex items-center justify-between py-5 text-sm">
        <span className="font-semibold tracking-tight">{site.name}</span>
        <div className="flex gap-5 text-muted">
          <a href="#limits" className="hover:text-ink">
            What it can’t do
          </a>
          <a href="#use-it" className="hover:text-ink">
            Use it anywhere
          </a>
          {site.repoUrl && (
            <a href={site.repoUrl} className="hover:text-ink">
              GitHub
            </a>
          )}
        </div>
      </nav>

      <header className="pt-10 pb-10 sm:pt-16">
        <h1 className="max-w-3xl font-display text-5xl leading-[1.05] tracking-tight sm:text-7xl">
          Your AI text has <em className="text-strip">invisible</em> characters in it.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">
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
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="panel p-5">
              <h3 className="font-semibold">Claude Code skill</h3>
              <p className="mt-1 text-sm text-muted">
                Clean files and your agent’s output straight from Claude Code, with the same
                engine and the same rules as this page.
              </p>
              <p className="mt-4 text-sm font-medium">Coming soon</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 border-t border-line py-8 text-sm text-muted sm:flex-row sm:justify-between">
        <p>
          Based on{" "}
          <a href={site.referenceUrl} className="underline underline-offset-2 hover:text-ink">
            watermarks-remover
          </a>{" "}
          by Guillaume Meyer (MIT).
        </p>
        <p>No tracking, no server. Unicode {UNICODE_DATA_VERSION} character data.</p>
      </footer>
    </div>
  );
}
