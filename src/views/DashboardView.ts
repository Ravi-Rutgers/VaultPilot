import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createElement } from "react";
import { DashboardPanel } from "./DashboardPanel";
import { CaptureModal } from "./CaptureModal";
import VaultPilotPlugin from "../main";

export const VIEW_TYPE_DASHBOARD = "vaultpilot-dashboard";

export class DashboardView extends ItemView {
  private root: Root | null = null;
  private plugin: VaultPilotPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: VaultPilotPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() { return VIEW_TYPE_DASHBOARD; }
  getDisplayText() { return "VaultPilot Dashboard"; }
  getIcon() { return "layout-dashboard"; }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.id = "vaultpilot-root";
    this.root = createRoot(container);
    this.rerender();
  }

  rerender() {
    this.root?.render(
      createElement(DashboardPanel, {
        app: this.app,
        settings: this.plugin.settings,
        onOpenCapture: () => new CaptureModal(this.app, this.plugin.settings).open(),
        suggestions: this.plugin.suggestions,
        isAnalyzing: this.plugin.isAnalyzing,
        analyzeProgress: this.plugin.analyzeProgress,
        onAnalyzeNow: () => this.plugin.analyzeNow(),
        onApplySuggestions: (ids) => this.plugin.applySuggestions(ids),
        onRejectAllSuggestions: () => this.plugin.rejectAllSuggestions(),
      })
    );
  }

  async onClose() {
    this.root?.unmount();
    this.root = null;
  }
}
