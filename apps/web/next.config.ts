import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static: the page is plain HTML/JS and all cleaning runs in the browser.
  output: "export",
  transpilePackages: ["@i-hate-watermarks/core"],
  // Don't let `next dev` write AGENTS.md / CLAUDE.md into the app.
  agentRules: false,
  experimental: {
    // Inline the (small) stylesheet into the HTML so first paint doesn't wait
    // on a separate render-blocking CSS request.
    inlineCss: true,
  },
};

export default nextConfig;
