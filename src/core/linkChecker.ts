import { CachedMetadata, TFile } from "obsidian";
import { CleanerIssue } from "../types";

export function detectEmptyFiles(files: TFile[]): CleanerIssue[] {
  return files
    .filter((f) => f.stat.size < 10)
    .map((file) => ({
      type: "empty" as const,
      file,
      details: "Bestand is leeg of heeft minder dan 10 bytes",
    }));
}

export function detectDuplicateTags(
  entries: { file: TFile; cache: CachedMetadata | null }[]
): CleanerIssue[] {
  const issues: CleanerIssue[] = [];
  for (const { file, cache } of entries) {
    const tags = cache?.frontmatter?.tags;
    if (!Array.isArray(tags)) continue;
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const tag of tags) {
      if (seen.has(tag)) duplicates.push(tag);
      else seen.add(tag);
    }
    if (duplicates.length > 0) {
      issues.push({
        type: "duplicate-tag",
        file,
        details: `Dubbele tags: ${[...new Set(duplicates)].join(", ")}`,
      });
    }
  }
  return issues;
}

export function detectOrphanInboxItems(
  files: TFile[],
  inboxFolder: string,
  thresholdDays: number
): CleanerIssue[] {
  const cutoff = Date.now() - thresholdDays * 24 * 60 * 60 * 1000;
  return files
    .filter((f) => f.path.startsWith(inboxFolder) && f.stat.ctime < cutoff)
    .map((file) => ({
      type: "orphan" as const,
      file,
      details: `Staat al ${thresholdDays}+ dagen in inbox`,
    }));
}

export function buildFileBasenameSet(files: TFile[]): Set<string> {
  return new Set(files.map((f) => f.basename));
}
