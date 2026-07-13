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
