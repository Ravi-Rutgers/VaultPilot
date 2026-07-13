import { Plugin, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, VaultPilotSettings } from "./settings/settings";
import { VaultPilotSettingsTab } from "./settings/SettingsTab";
import { DashboardView, VIEW_TYPE_DASHBOARD } from "./views/DashboardView";
import { CleanerView, VIEW_TYPE_CLEANER } from "./views/CleanerView";
import { KanbanView, VIEW_TYPE_KANBAN } from "./views/KanbanView";
import { SmartGraphView, VIEW_TYPE_GRAPH } from "./views/SmartGraphView";
import { CaptureModal } from "./views/CaptureModal";
import { BackgroundAnalyzer } from "./core/backgroundAnalyzer";
import {
  Suggestion,
  fetchGroqSuggestions,
  deduplicateSuggestions,
  wikilinkLine,
} from "./core/fastConnect";

export default class VaultPilotPlugin extends Plugin {
  settings: VaultPilotSettings = DEFAULT_SETTINGS;
  suggestions: Suggestion[] = [];
  isAnalyzing = false;
  analyzeProgress = 0;

  private backgroundAnalyzer: BackgroundAnalyzer | null = null;

  async onload() {
    await this.loadSettings();

    // Suggesties worden geladen in loadSettings()

    this.registerView(
      VIEW_TYPE_DASHBOARD,
      (leaf) => new DashboardView(leaf, this)
    );
    this.registerView(
      VIEW_TYPE_CLEANER,
      (leaf) => new CleanerView(leaf, this)
    );
    this.registerView(
      VIEW_TYPE_KANBAN,
      (leaf) => new KanbanView(leaf, this)
    );
    this.registerView(
      VIEW_TYPE_GRAPH,
      (leaf) => new SmartGraphView(leaf, this)
    );

    this.addRibbonIcon("layout-dashboard", "VaultPilot Dashboard", () => {
      this.activateView(VIEW_TYPE_DASHBOARD);
    });

    this.addCommand({
      id: "open-dashboard",
      name: "Open Dashboard",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "d" }],
      callback: () => this.activateView(VIEW_TYPE_DASHBOARD),
    });

    this.addCommand({
      id: "open-cleaner",
      name: "Vault Cleaner openen",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "v" }],
      callback: () => this.activateView(VIEW_TYPE_CLEANER),
    });

    this.addCommand({
      id: "open-kanban",
      name: "Kanban Board openen",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "k" }],
      callback: () => this.activateView(VIEW_TYPE_KANBAN),
    });

    this.addCommand({
      id: "open-graph",
      name: "Smart Graph openen",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "g" }],
      callback: () => this.activateView(VIEW_TYPE_GRAPH),
    });

    this.addCommand({
      id: "quick-capture",
      name: "Quick Capture",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "c" }],
      callback: () => new CaptureModal(this.app, this.settings).open(),
    });

    this.addCommand({
      id: "fast-connect-analyze",
      name: "Fast Connect: Analyseer vault",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "f" }],
      callback: () => this.analyzeNow(),
    });

    this.addCommand({
      id: "fast-connect-open",
      name: "Fast Connect: Bekijk suggesties",
      callback: () => {
        this.activateView(VIEW_TYPE_DASHBOARD);
      },
    });

    this.addSettingTab(new VaultPilotSettingsTab(this.app, this));

    this.backgroundAnalyzer = new BackgroundAnalyzer(
      this.app,
      this.settings,
      () => this.suggestions,
      (s) => {
        this.suggestions = s;
        this.saveSuggestions(s);
        this.refreshDashboard();
      }
    );

    this.app.workspace.onLayoutReady(() => {
      this.activateView(VIEW_TYPE_DASHBOARD);
      this.backgroundAnalyzer?.start();
    });
  }

  onunload() {
    this.backgroundAnalyzer?.stop();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DASHBOARD);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CLEANER);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_KANBAN);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_GRAPH);
  }

  async loadSettings() {
    const data = await this.loadData() ?? {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    this.suggestions = data.suggestions ?? [];
  }

  async saveSettings() {
    const data = await this.loadData() ?? {};
    await this.saveData({ ...data, ...this.settings });
  }

  private async saveSuggestions(suggestions: Suggestion[]): Promise<void> {
    const data = await this.loadData() ?? {};
    await this.saveData({ ...data, suggestions });
  }

  refreshDashboard(): void {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD);
    for (const leaf of leaves) {
      (leaf.view as DashboardView).rerender();
    }
  }

  async analyzeNow(): Promise<void> {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;
    this.analyzeProgress = 0;
    this.refreshDashboard();

    // Stap 1: regel-gebaseerde analyse
    await this.backgroundAnalyzer?.runOnce();
    this.analyzeProgress = 30;
    this.refreshDashboard();

    // Stap 2: Groq AI (alleen als sleutel aanwezig)
    if (this.settings.groqApiKey) {
      const files = this.app.vault
        .getMarkdownFiles()
        .map((f) => ({ path: f.path, basename: f.basename }));

      const fileContents: Record<string, string> = {};
      await Promise.all(
        files.map(async (f) => {
          try {
            const tf = this.app.vault.getFileByPath(f.path);
            if (tf) fileContents[f.path] = await this.app.vault.read(tf);
          } catch { /* overslaan */ }
        })
      );

      const aiSuggestions = await fetchGroqSuggestions(
        files,
        fileContents,
        this.app.metadataCache.resolvedLinks,
        this.settings.groqApiKey,
        (done, total) => {
          this.analyzeProgress = 30 + Math.round((done / total) * 70);
          this.refreshDashboard();
        }
      );

      this.suggestions = deduplicateSuggestions(this.suggestions, aiSuggestions);
      await this.saveSuggestions(this.suggestions);
    }

    this.analyzeProgress = 100;
    this.isAnalyzing = false;
    this.refreshDashboard();
  }

  async applySuggestions(ids: string[]): Promise<void> {
    const toApply = this.suggestions.filter((s) => ids.includes(s.id));

    for (const suggestion of toApply) {
      try {
        const file = this.app.vault.getFileByPath(suggestion.source);
        if (!file) continue;
        const content = await this.app.vault.read(file);
        if (content.includes(`[[${suggestion.targetBasename}]]`)) {
          suggestion.status = "accepted";
          continue;
        }
        await this.app.vault.modify(file, content + wikilinkLine(suggestion.targetBasename));
        suggestion.status = "accepted";
      } catch { /* bestand verwijderd, overslaan */ }
    }

    await this.saveSuggestions(this.suggestions);
    this.refreshDashboard();
  }

  rejectAllSuggestions(): void {
    for (const s of this.suggestions) {
      if (s.status === "pending") s.status = "rejected";
    }
    this.saveSuggestions(this.suggestions);
    this.refreshDashboard();
  }

  async openView(viewType: string) {
    await this.activateView(viewType);
  }

  private async activateView(viewType: string) {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(viewType);

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf(true);
      await leaf.setViewState({ type: viewType, active: true });
    }

    if (leaf) workspace.revealLeaf(leaf);
  }
}
