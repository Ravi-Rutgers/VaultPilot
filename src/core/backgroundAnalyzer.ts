import { App } from "obsidian";
import { VaultPilotSettings } from "../settings/settings";
import {
  Suggestion,
  findRuleBasedSuggestions,
  deduplicateSuggestions,
} from "./fastConnect";

const INTERVAL_MS = 30 * 60 * 1000;

export class BackgroundAnalyzer {
  private intervalId: number | null = null;

  constructor(
    private app: App,
    private settings: VaultPilotSettings,
    private getSuggestions: () => Suggestion[],
    private setSuggestions: (s: Suggestion[]) => void
  ) {}

  start(): void {
    this.runOnce();
    this.intervalId = window.setInterval(() => this.runOnce(), INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async runOnce(): Promise<void> {
    try {
      const files = this.app.vault
        .getMarkdownFiles()
        .map((f) => ({ path: f.path, basename: f.basename }));

      const fileContents: Record<string, string> = {};
      await Promise.all(
        files.map(async (f) => {
          try {
            const tf = this.app.vault.getFileByPath(f.path);
            if (tf) fileContents[f.path] = await this.app.vault.read(tf);
          } catch {
            // bestand verwijderd tussen listing en lezen
          }
        })
      );

      const resolvedLinks = this.app.metadataCache.resolvedLinks;
      const newSuggestions = findRuleBasedSuggestions(files, fileContents, resolvedLinks);
      const merged = deduplicateSuggestions(this.getSuggestions(), newSuggestions);
      this.setSuggestions(merged);
    } catch {
      // silent fail
    }
  }
}
