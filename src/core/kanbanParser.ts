import { App, TFile } from "obsidian";

export type KanbanStatus = "todo" | "doing" | "done";

export interface KanbanTask {
  text: string;
  status: KanbanStatus;
  lineNumber: number;
  file: TFile;
}

const MARKERS: Record<KanbanStatus, string> = {
  todo: "- [ ]",
  doing: "- [/]",
  done: "- [x]",
};

const PATTERNS: [RegExp, KanbanStatus][] = [
  [/^- \[ \] (.+)/, "todo"],
  [/^- \[\/\] (.+)/, "doing"],
  [/^- \[x\] (.+)/i, "done"],
];

export function parseKanbanTasks(content: string, file: TFile): KanbanTask[] {
  return content
    .split("\n")
    .flatMap((line, index) => {
      for (const [pattern, status] of PATTERNS) {
        const match = pattern.exec(line);
        if (match) return [{ text: match[1].trim(), status, lineNumber: index, file }];
      }
      return [];
    });
}

export function updateTaskStatus(content: string, lineNumber: number, newStatus: KanbanStatus): string {
  const lines = content.split("\n");
  lines[lineNumber] = lines[lineNumber].replace(/^- \[.?\]/, MARKERS[newStatus]);
  return lines.join("\n");
}

export function nextStatus(current: KanbanStatus): KanbanStatus {
  if (current === "todo") return "doing";
  if (current === "doing") return "done";
  return "todo";
}

export interface LabelResult {
  label: "hoog" | "midden" | "laag" | null;
  cleanText: string;
}

export function extractLabel(text: string): LabelResult {
  const match = text.match(/#(hoog|midden|laag)\b/i);
  if (!match) return { label: null, cleanText: text };
  const label = match[1].toLowerCase() as "hoog" | "midden" | "laag";
  const cleanText = text.replace(match[0], "").replace(/\s{2,}/g, " ").trim();
  return { label, cleanText };
}

export function updateTaskText(content: string, lineNumber: number, newText: string): string {
  const lines = content.split("\n");
  const line = lines[lineNumber];
  const markerMatch = line.match(/^- \[.?\] /);
  if (!markerMatch) return content;
  lines[lineNumber] = `${markerMatch[0]}${newText}`;
  return lines.join("\n");
}

export function appendTaskToContent(content: string, text: string, status: KanbanStatus): string {
  const marker = MARKERS[status];
  const line = `${marker} ${text}`;
  if (!content) return line;
  return content.endsWith("\n") ? `${content}${line}` : `${content}\n${line}`;
}

export async function loadTasksFromFolder(app: App, folderPath: string): Promise<KanbanTask[]> {
  const allFiles = app.vault.getMarkdownFiles();
  const inFolder = allFiles.filter((f) => f.path.startsWith(folderPath));
  const results: KanbanTask[] = [];
  for (const file of inFolder) {
    try {
      const content = await app.vault.read(file);
      results.push(...parseKanbanTasks(content, file));
    } catch {
      // bestand niet leesbaar — overslaan
    }
  }
  return results;
}

export function deleteTask(content: string, lineNumber: number): string {
  const lines = content.split("\n");
  if (lineNumber < 0 || lineNumber >= lines.length) return content;
  lines.splice(lineNumber, 1);
  return lines.join("\n");
}
