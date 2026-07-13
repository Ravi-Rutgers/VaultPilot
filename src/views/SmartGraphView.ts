import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createElement } from "react";
import { SmartGraphPanel } from "./SmartGraphPanel";
import VaultPilotPlugin from "../main";

export const VIEW_TYPE_GRAPH = "vaultpilot-smart-graph";

export class SmartGraphView extends ItemView {
  private root: Root | null = null;
  private plugin: VaultPilotPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: VaultPilotPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() { return VIEW_TYPE_GRAPH; }
  getDisplayText() { return "VaultPilot Smart Graph"; }
  getIcon() { return "git-fork"; }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.id = "vaultpilot-graph-root";
    this.root = createRoot(container);
    this.root.render(
      createElement(SmartGraphPanel, {
        app: this.app,
        settings: this.plugin.settings,
      })
    );
  }

  onClose() {
    this.root?.unmount();
    this.root = null;
  }
}
