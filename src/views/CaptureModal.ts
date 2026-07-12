import { App, Modal, Notice } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createElement } from "react";
import { CaptureForm, CaptureType } from "./CaptureForm";
import { VaultPilotSettings } from "../settings/settings";

export class CaptureModal extends Modal {
  private root: Root | null = null;
  private settings: VaultPilotSettings;

  constructor(app: App, settings: VaultPilotSettings) {
    super(app);
    this.settings = settings;
  }

  onOpen() {
    this.titleEl.setText("Quick Capture");
    this.root = createRoot(this.contentEl);
    this.root.render(
      createElement(CaptureForm, {
        onCapture: (text, type) => this.handleCapture(text, type),
        onClose: () => this.close(),
      })
    );
  }

  private async handleCapture(text: string, type: CaptureType) {
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const isoDate = `${yyyy}-${mm}-${dd}`;
      const displayDate = `${dd}-${mm}-${yyyy}`;
      const slug =
        text
          .slice(0, 30)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "capture";

      const folder =
        type === "idea" ? this.settings.ideasFolder : this.settings.inboxFolder;
      const normalizedFolder = folder.endsWith("/") ? folder : `${folder}/`;
      const tag = type === "idea" ? "idee" : type === "task" ? "taak" : "inbox";
      const filename = `${displayDate}-${slug}.md`;
      const path = `${normalizedFolder}${filename}`;

      try {
        await this.app.vault.createFolder(normalizedFolder);
      } catch {
        // folder already exists — fine
      }

      const content = `---\ndate: ${isoDate}\ntags:\n  - ${tag}\n---\n\n${text}\n`;
      await this.app.vault.create(path, content);
      new Notice(`✅ Vastgelegd in ${normalizedFolder}`);
      this.close();
    } catch (e) {
      new Notice(`❌ Fout bij opslaan: ${(e as Error).message}`);
    }
  }

  onClose() {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}
