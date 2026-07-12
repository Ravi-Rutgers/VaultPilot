import { TFile } from "obsidian";
import { TaskItem } from "../types";

export function parseOpenTasks(content: string, file: TFile): TaskItem[] {
  return content
    .split("\n")
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^- \[ \]/.test(line))
    .map(({ line, index }) => ({
      text: line.replace(/^- \[ \] /, "").trim(),
      file,
      lineNumber: index,
    }));
}
