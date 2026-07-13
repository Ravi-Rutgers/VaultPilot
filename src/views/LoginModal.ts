import { App, Modal, Setting, Notice } from "obsidian";
import { signInWithEmail, verifyOtp, ensureVaultLinked } from "../core/supabaseClient";
import { Session } from "@supabase/supabase-js";

export class LoginModal extends Modal {
  private email = "";
  private code = "";
  private step: "email" | "code" = "email";
  private onSuccess: (session: Session, vaultId: string) => void;
  private vaultName: string;

  constructor(
    app: App,
    vaultName: string,
    onSuccess: (session: Session, vaultId: string) => void
  ) {
    super(app);
    this.vaultName = vaultName;
    this.onSuccess = onSuccess;
  }

  onOpen() {
    this.renderEmail();
  }

  private renderEmail() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "VaultPilot — Inloggen" });
    contentEl.createEl("p", {
      text: "Voer je e-mailadres in. Je ontvangt een 6-cijferige code.",
      cls: "setting-item-description",
    });

    new Setting(contentEl)
      .setName("E-mailadres")
      .addText((text) =>
        text
          .setPlaceholder("jij@voorbeeld.nl")
          .onChange((v) => (this.email = v.trim()))
          .then((t) => { t.inputEl.style.width = "100%"; t.inputEl.focus(); })
      );

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Stuur code")
          .setCta()
          .onClick(async () => {
            if (!this.email) { new Notice("Voer een e-mailadres in."); return; }
            btn.setButtonText("Bezig...").setDisabled(true);
            const { error } = await signInWithEmail(this.email);
            if (error) {
              new Notice(`Fout: ${error}`);
              btn.setButtonText("Stuur code").setDisabled(false);
            } else {
              this.step = "code";
              this.renderCode();
            }
          })
      );
  }

  private renderCode() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "VaultPilot — Code invoeren" });
    contentEl.createEl("p", {
      text: `Code verstuurd naar ${this.email}. Controleer je inbox (en spam).`,
      cls: "setting-item-description",
    });

    new Setting(contentEl)
      .setName("6-cijferige code")
      .addText((text) =>
        text
          .setPlaceholder("123456")
          .onChange((v) => (this.code = v.trim()))
          .then((t) => {
            t.inputEl.style.width = "100%";
            t.inputEl.setAttribute("inputmode", "numeric");
            t.inputEl.focus();
          })
      );

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Bevestig")
          .setCta()
          .onClick(async () => {
            if (!this.code) { new Notice("Voer de code in."); return; }
            btn.setButtonText("Verifiëren...").setDisabled(true);
            const { session, error } = await verifyOtp(this.email, this.code);
            if (error || !session) {
              new Notice(`Ongeldige code: ${error ?? "onbekende fout"}`);
              btn.setButtonText("Bevestig").setDisabled(false);
            } else {
              const vaultId = await ensureVaultLinked(this.vaultName);
              if (!vaultId) {
                new Notice("Ingelogd maar vault kon niet worden gekoppeld.");
                this.close();
                return;
              }
              new Notice("✅ Verbonden met VaultPilot!");
              this.onSuccess(session, vaultId);
              this.close();
            }
          })
      )
      .addButton((btn) =>
        btn
          .setButtonText("Ander e-mailadres")
          .onClick(() => { this.step = "email"; this.renderEmail(); })
      );
  }

  onClose() {
    this.contentEl.empty();
  }
}
