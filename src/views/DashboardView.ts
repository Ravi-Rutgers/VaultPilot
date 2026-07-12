import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createElement } from "react";
import { DashboardPanel } from "./DashboardPanel";
import VaultPilotPlugin from "../main";

export const VIEW_TYPE_DASHBOARD = "vaultpilot-dashboard";

export class DashboardView extends ItemView {
  private root: Root | null = null;
  private plugin: VaultPilotPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: VaultPilotPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_DASHBOARD;
  }

  getDisplayText() {
    return "VaultPilot Dashboard";
  }

  getIcon() {
    return "layout-dashboard";
  }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.id = "vaultpilot-root";
    this.root = createRoot(container);
    this.root.render(
      createElement(DashboardPanel, {
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
