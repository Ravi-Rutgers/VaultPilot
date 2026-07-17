import { App, Modal } from "obsidian";
import { VaultPilotSettings } from "../settings/settings";
import { ClaudeService } from "../core/claudeService";

export class ClaudeChatModal extends Modal {
  private service: ClaudeService;
  private messagesEl!: HTMLElement;
  private inputEl!: HTMLTextAreaElement;
  private sendBtn!: HTMLButtonElement;

  constructor(app: App, private settings: VaultPilotSettings) {
    super(app);
    this.service = new ClaudeService(app, settings);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("vaultpilot-claude-chat");

    contentEl.createEl("div", { cls: "claude-header" }, (el) => {
      el.createEl("span", { text: "✦ Claude", cls: "claude-header-title" });
      el.createEl("span", { text: "VaultPilot AI", cls: "claude-header-sub" });
    });

    this.messagesEl = contentEl.createEl("div", { cls: "claude-messages" });

    this.addAssistantBubble("Hoi! Ik kan je taken lezen, aanmaken en bijwerken. Vraag maar iets — bijv. \"Wat zijn mijn openstaande taken?\" of \"Maak een taak aan voor VaultPilot: readme updaten.\"");

    const footer = contentEl.createEl("div", { cls: "claude-footer" });
    this.inputEl = footer.createEl("textarea", {
      cls: "claude-input",
      attr: { placeholder: "Schrijf een bericht… (Enter = stuur, Shift+Enter = nieuwe regel)", rows: "2" },
    }) as HTMLTextAreaElement;
    this.sendBtn = footer.createEl("button", { text: "↑", cls: "claude-send-btn" });

    this.sendBtn.onclick = () => this.handleSend();
    this.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); this.handleSend(); }
    });

    setTimeout(() => this.inputEl.focus(), 50);
  }

  private async handleSend() {
    const text = this.inputEl.value.trim();
    if (!text || this.sendBtn.disabled) return;

    this.inputEl.value = "";
    this.addUserBubble(text);
    this.setSending(true);

    const typingEl = this.addTypingIndicator();

    try {
      const reply = await this.service.sendMessage(text, (summary) => {
        this.addToolChip(summary);
      });
      typingEl.remove();
      this.addAssistantBubble(reply);
    } catch (e) {
      typingEl.remove();
      this.addAssistantBubble(`⚠️ ${(e as Error).message}`);
    } finally {
      this.setSending(false);
      this.inputEl.focus();
    }
  }

  private addUserBubble(text: string) {
    this.messagesEl.createEl("div", { cls: "claude-bubble claude-bubble-user" }, (el) => {
      el.createEl("div", { text, cls: "claude-bubble-text" });
    });
    this.scroll();
  }

  private addAssistantBubble(text: string) {
    this.messagesEl.createEl("div", { cls: "claude-bubble claude-bubble-ai" }, (el) => {
      el.createEl("span", { text: "✦", cls: "claude-avatar" });
      el.createEl("div", { text, cls: "claude-bubble-text" });
    });
    this.scroll();
  }

  private addToolChip(summary: string) {
    this.messagesEl.createEl("div", { cls: "claude-tool-chip" }, (el) => {
      el.createEl("span", { text: "⚙ " });
      el.createEl("span", { text: summary });
    });
    this.scroll();
  }

  private addTypingIndicator(): HTMLElement {
    const el = this.messagesEl.createEl("div", { cls: "claude-bubble claude-bubble-ai claude-typing" });
    el.createEl("span", { text: "✦", cls: "claude-avatar" });
    el.createEl("div", { cls: "claude-dots" }, (d) => {
      d.createEl("span"); d.createEl("span"); d.createEl("span");
    });
    this.scroll();
    return el;
  }

  private setSending(on: boolean) {
    this.sendBtn.disabled = on;
    this.inputEl.disabled = on;
    this.sendBtn.textContent = on ? "…" : "↑";
  }

  private scroll() {
    setTimeout(() => { this.messagesEl.scrollTop = this.messagesEl.scrollHeight; }, 10);
  }

  onClose() { this.contentEl.empty(); }
}
