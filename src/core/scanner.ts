import { TFile } from "obsidian";
import { ProjectInfo } from "../types";

export function filterProjectFiles(files: TFile[], projectsFolder: string): TFile[] {
  return files.filter((f) => {
    if (!f.path.startsWith(projectsFolder)) return false;
    const relative = f.path.slice(projectsFolder.length);
    const parts = relative.split("/");
    // Only root project files: "ProjectName/ProjectName.md"
    return parts.length === 2 && parts[0] === parts[1].replace(".md", "");
  });
}

export function filterActiveProjects(
  files: TFile[],
  caches: { file: TFile; frontmatter: Record<string, string> }[]
): ProjectInfo[] {
  return files
    .map((file) => {
      const entry = caches.find((c) => c.file === file);
      const status = entry?.frontmatter?.status ?? "unknown";
      return { name: file.basename, path: file.path, status, file };
    })
    .filter((p) => p.status === "actief");
}

export function getRecentFiles(files: TFile[], count: number): TFile[] {
  return [...files].sort((a, b) => b.stat.mtime - a.stat.mtime).slice(0, count);
}
