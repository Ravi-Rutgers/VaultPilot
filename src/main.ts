import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, VaultPilotSettings } from "./settings/settings";

export default class VaultPilotPlugin extends Plugin {
  settings: VaultPilotSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();
  }

  async onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
