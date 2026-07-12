import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createElement } from "react";
import { CleanerPanel } from "./CleanerPanel";
import VaultPilotPlugin from "../main";

export const VIEW_TYPE_CLEANER = "vaultpilot-cleaner";

export class CleanerView extends ItemView {
  private root: Root | null = null;
  private plugin: VaultPilotPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: VaultPilotPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() { return VIEW_TYPE_CLEANER; }
  getDisplayText() { return "VaultPilot Cleaner"; }
  getIcon() { return "trash-2"; }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.id = "vaultpilot-root";
    this.root = createRoot(container);
    this.root.render(
      createElement(CleanerPanel, {
        app: this.app,
        settings: this.plugin.settings,
      })
    );
  }

  async onClose() {
    this.root?.unmount();
    this.root = null;
  }
}
