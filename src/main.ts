import { Plugin, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, VaultPilotSettings } from "./settings/settings";
import { VaultPilotSettingsTab } from "./settings/SettingsTab";
import { DashboardView, VIEW_TYPE_DASHBOARD } from "./views/DashboardView";
import { CleanerView, VIEW_TYPE_CLEANER } from "./views/CleanerView";
import { CaptureModal } from "./views/CaptureModal";

export default class VaultPilotPlugin extends Plugin {
  settings: VaultPilotSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_DASHBOARD,
      (leaf) => new DashboardView(leaf, this)
    );
    this.registerView(
      VIEW_TYPE_CLEANER,
      (leaf) => new CleanerView(leaf, this)
    );

    this.addRibbonIcon("layout-dashboard", "VaultPilot Dashboard", () => {
      this.activateView(VIEW_TYPE_DASHBOARD);
    });

    this.addCommand({
      id: "open-dashboard",
      name: "Open Dashboard",
      callback: () => this.activateView(VIEW_TYPE_DASHBOARD),
    });

    this.addCommand({
      id: "open-cleaner",
      name: "Scan Vault (Cleaner)",
      callback: () => this.activateView(VIEW_TYPE_CLEANER),
    });

    this.addCommand({
      id: "quick-capture",
      name: "Quick Capture",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "c" }],
      callback: () => new CaptureModal(this.app, this.settings).open(),
    });

    this.addSettingTab(new VaultPilotSettingsTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      this.activateView(VIEW_TYPE_DASHBOARD);
    });
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DASHBOARD);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CLEANER);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
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
