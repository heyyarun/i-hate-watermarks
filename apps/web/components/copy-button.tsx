"use client";

import { useEffect, useState } from "react";

export function CopyButton({
  text,
  className = "btn-primary min-w-24",
}: {
  text: string;
  className?: string;
}) {
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
      setState(copyWithSelection(text) ? "copied" : "failed");
    }
  }

  return (
    <button type="button" className={className} onClick={copy} disabled={!text}>
      {state === "copied" ? "Copied ✓" : state === "failed" ? "Copy failed" : "Copy"}
    </button>
  );
}

/**
 * Fallback for when the Clipboard API is missing or refused, as in some
 * embedded webviews and in-app browsers that deny clipboard-write. Copying a
 * selection with execCommand still works there during the click.
 */
function copyWithSelection(text: string): boolean {
  const focused = document.activeElement as HTMLElement | null;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  focused?.focus();
  return ok;
}
