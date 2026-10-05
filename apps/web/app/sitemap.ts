import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

// Bump when the page content changes. new Date() would claim a change on
// every deploy, and Google ignores lastmod values it finds unreliable.
const LAST_MODIFIED = "2026-10-06";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.url,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
