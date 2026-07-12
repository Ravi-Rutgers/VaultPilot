import { TFile } from "obsidian";

export interface ProjectInfo {
  name: string;
  path: string;
  status: string;
  file: TFile;
}

export interface TaskItem {
  text: string;
  file: TFile;
  lineNumber: number;
}

export type CleanerIssueType = "empty" | "broken-link" | "duplicate-tag" | "orphan";

export interface CleanerIssue {
  type: CleanerIssueType;
  file: TFile;
  details: string;
}
