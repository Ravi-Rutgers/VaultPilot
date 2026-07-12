import { App, PluginSettingTab, Setting } from "obsidian";
import VaultPilotPlugin from "../main";

export class VaultPilotSettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: VaultPilotPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "VaultPilot Instellingen" });

    new Setting(containerEl)
      .setName("Projecten map")
      .setDesc("Pad naar je projecten (eindig met /)")
      .addText((text) =>
        text
          .setPlaceholder("projects/")
          .setValue(this.plugin.settings.projectsFolder)
          .onChange(async (value) => {
            this.plugin.settings.projectsFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Inbox map")
      .setDesc("Pad voor Quick Capture inbox items")
      .addText((text) =>
        text
          .setPlaceholder("inbox/")
          .setValue(this.plugin.settings.inboxFolder)
          .onChange(async (value) => {
            this.plugin.settings.inboxFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Ideeën map")
      .setDesc("Pad voor Quick Capture ideeën")
      .addText((text) =>
        text
          .setPlaceholder("ideas/")
          .setValue(this.plugin.settings.ideasFolder)
          .onChange(async (value) => {
            this.plugin.settings.ideasFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Orphan drempel (dagen)")
      .setDesc("Inbox items ouder dan dit worden als verweesd gemarkeerd")
      .addSlider((slider) =>
        slider
          .setLimits(7, 90, 1)
          .setValue(this.plugin.settings.orphanThresholdDays)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.orphanThresholdDays = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
