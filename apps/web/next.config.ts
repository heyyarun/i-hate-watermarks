import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static: the page is plain HTML/JS and all cleaning runs in the browser.
  output: "export",
  transpilePackages: ["@i-hate-watermarks/core"],
  // Don't let `next dev` write AGENTS.md / CLAUDE.md into the app.
  agentRules: false,
};

export default nextConfig;
