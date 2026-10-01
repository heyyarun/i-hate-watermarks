export const site = {
  name: "I Hate Watermarks",
  description:
    "Paste AI-generated text, see the invisible characters hidden in it, and copy a clean version. Runs entirely in your browser.",
  // GitHub links on the site are hidden while this is null.
  repoUrl: "https://github.com/heyyarun/i-hate-watermarks" as string | null,
  referenceUrl: "https://github.com/guillaumemeyer/watermarks-remover",
  skillName: "remove-ai-watermarks",
};

// The skills CLI (https://skills.sh) installs from a GitHub "owner/repo".
const repoSlug = site.repoUrl?.replace(/^https:\/\/github\.com\//, "") ?? null;
export const skill = repoSlug
  ? {
      installCommand: `npx skills add ${repoSlug}`,
      folderUrl: `${site.repoUrl}/tree/main/skills/${site.skillName}`,
    }
  : null;
