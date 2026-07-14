import { TFile } from "obsidian";

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
