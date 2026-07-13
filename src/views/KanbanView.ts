import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createElement } from "react";
import { KanbanPanel } from "./KanbanPanel";
import VaultPilotPlugin from "../main";

export const VIEW_TYPE_KANBAN = "vaultpilot-kanban";

export class KanbanView extends ItemView {
  private root: Root | null = null;
  private plugin: VaultPilotPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: VaultPilotPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() { return VIEW_TYPE_KANBAN; }
  getDisplayText() { return "VaultPilot Kanban"; }
  getIcon() { return "layout-kanban"; }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.id = "vaultpilot-root";
    this.root = createRoot(container);
    this.root.render(
      createElement(KanbanPanel, {
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
