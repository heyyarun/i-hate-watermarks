"use client";

import { useEffect, useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(t);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <button type="button" className="btn-primary min-w-24" onClick={copy} disabled={!text}>
      {state === "copied" ? "Copied ✓" : state === "failed" ? "Copy failed" : "Copy"}
    </button>
  );
}
