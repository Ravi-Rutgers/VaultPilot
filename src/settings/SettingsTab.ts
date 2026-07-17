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

    new Setting(containerEl)
      .setName("Fast Connect — minimale betrouwbaarheid")
      .setDesc("Suggesties met een lagere score worden verborgen (0.5 = alles zien, 0.9 = alleen hoge zekerheid)")
      .addSlider((slider) =>
        slider
          .setLimits(0.5, 0.95, 0.05)
          .setValue(this.plugin.settings.fastConnectMinConfidence)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.fastConnectMinConfidence = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Groq API-sleutel")
      .setDesc("Vereist voor AI-analyse in Fast Connect. Gratis te verkrijgen op console.groq.com")
      .addText((text) => {
        text
          .setPlaceholder("gsk_...")
          .setValue(this.plugin.settings.groqApiKey)
          .onChange(async (value) => {
            this.plugin.settings.groqApiKey = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.setAttribute("type", "password");
        return text;
      });

    containerEl.createEl("h3", { text: "Claude AI (taakbeheer)" });

    new Setting(containerEl)
      .setName("Claude API-sleutel")
      .setDesc("Vereist voor Claude Chat (⌃⇧E). Verkrijg een sleutel op console.anthropic.com")
      .addText((text) => {
        text
          .setPlaceholder("sk-ant-...")
          .setValue(this.plugin.settings.claudeApiKey)
          .onChange(async (value) => {
            this.plugin.settings.claudeApiKey = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.setAttribute("type", "password");
        return text;
      });
  }
}
