import { App, Modal, Notice, TFile } from "obsidian";

type Action = "summarize" | "tags" | "rewrite";

export class AiActionsModal extends Modal {
  private file: TFile;
  private content: string;
  private groqKey: string;

  constructor(app: App, file: TFile, content: string, groqKey: string) {
    super(app);
    this.file = file;
    this.content = content;
    this.groqKey = groqKey;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("vaultpilot-ai-actions");

    contentEl.createEl("div", { cls: "ai-header" }, (el) => {
      el.createEl("div", { text: "✨ AI Quick Actions", cls: "ai-title" });
      el.createEl("div", { text: this.file.basename, cls: "ai-filename" });
    });

    const body = contentEl.createEl("div", { cls: "ai-body" });
    const resultEl = contentEl.createEl("div", { cls: "ai-result" });

    const actions: { label: string; desc: string; action: Action }[] = [
      { label: "📝 Vat samen", desc: "Beknopte samenvatting van deze notitie", action: "summarize" },
      { label: "🏷 Suggereer tags", desc: "Relevante tags voorstellen op basis van inhoud", action: "tags" },
      { label: "✍ Herschrijf", desc: "Maak de tekst helderder en bondiger", action: "rewrite" },
    ];

    for (const { label, desc, action } of actions) {
      const btn = body.createEl("button", { cls: "ai-action-btn" });
      btn.createEl("span", { text: label, cls: "ai-action-label" });
      btn.createEl("span", { text: desc, cls: "ai-action-desc" });
      btn.onclick = () => this.runAction(action, resultEl, body);
    }
  }

  private async runAction(action: Action, resultEl: HTMLElement, body: HTMLElement) {
    resultEl.empty();
    resultEl.createEl("div", { text: "Laden…", cls: "ai-loading" });

    try {
      const result = await this.callGroq(action);
      resultEl.empty();

      resultEl.createEl("div", { cls: "ai-result-header" }, (el) => {
        el.createEl("span", { text: this.actionLabel(action), cls: "ai-result-label" });
        if (action === "tags") {
          const insertBtn = el.createEl("button", { text: "Voeg in", cls: "ai-insert-btn" });
          insertBtn.onclick = async () => {
            await this.insertTags(result);
            new Notice("Tags ingevoegd.");
            this.close();
          };
        } else if (action === "rewrite") {
          const replaceBtn = el.createEl("button", { text: "Vervang inhoud", cls: "ai-insert-btn" });
          replaceBtn.onclick = async () => {
            const file = this.app.vault.getFileByPath(this.file.path);
            if (file) await this.app.vault.modify(file, result);
            new Notice("Notitie herschreven.");
            this.close();
          };
        } else {
          const copyBtn = el.createEl("button", { text: "Kopieer", cls: "ai-insert-btn" });
          copyBtn.onclick = () => { navigator.clipboard.writeText(result); new Notice("Gekopieerd."); };
        }
      });

      resultEl.createEl("div", { text: result, cls: "ai-result-text" });
    } catch (e) {
      resultEl.empty();
      resultEl.createEl("div", { text: `Fout: ${(e as Error).message}`, cls: "ai-error" });
    }
  }

  private actionLabel(action: Action): string {
    return action === "summarize" ? "📝 Samenvatting" : action === "tags" ? "🏷 Tags" : "✍ Herschreven";
  }

  private async callGroq(action: Action): Promise<string> {
    const truncated = this.content.slice(0, 6000);
    const prompts: Record<Action, string> = {
      summarize: `Vat de volgende notitie samen in maximaal 3 zinnen in het Nederlands:\n\n${truncated}`,
      tags: `Suggereer 5-8 relevante tags (zonder #, kommagescheiden, in het Nederlands/Engels) voor:\n\n${truncated}\n\nGeef alleen de tags, niets anders.`,
      rewrite: `Herschrijf de volgende notitie: maak hem helderder, bondiger en beter gestructureerd. Behoud alle informatie. Reageer alleen met de herschreven tekst:\n\n${truncated}`,
    };

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompts[action] }],
        max_tokens: action === "rewrite" ? 2000 : 300,
        temperature: 0.4,
      }),
    });

    const json = await res.json() as any;
    const text = json.choices?.[0]?.message?.content as string | undefined;
    if (!text) throw new Error("Geen antwoord van Groq.");
    return text.trim();
  }

  private async insertTags(tagsStr: string): Promise<void> {
    const file = this.app.vault.getFileByPath(this.file.path);
    if (!file) return;
    const content = await this.app.vault.read(file);
    const tags = tagsStr.split(",").map((t) => t.trim().replace(/\s+/g, "-").toLowerCase()).filter(Boolean);

    // Voeg toe aan frontmatter als die bestaat, anders begin van bestand
    if (content.startsWith("---")) {
      const end = content.indexOf("---", 3);
      if (end !== -1) {
        const frontmatter = content.slice(0, end + 3);
        const rest = content.slice(end + 3);
        if (frontmatter.includes("tags:")) {
          const tagLines = tags.map((t) => `  - ${t}`).join("\n");
          const updated = frontmatter.replace(/(tags:\s*\n)/, `$1${tagLines}\n`) + rest;
          await this.app.vault.modify(file, updated);
        } else {
          const tagBlock = `tags:\n${tags.map((t) => `  - ${t}`).join("\n")}\n`;
          const updated = frontmatter.slice(0, -3) + tagBlock + "---" + rest;
          await this.app.vault.modify(file, updated);
        }
        return;
      }
    }
    // Geen frontmatter — voeg toe als tekst onderaan
    const tagLine = "\n\nTags: " + tags.map((t) => `#${t}`).join(" ");
    await this.app.vault.modify(file, content + tagLine);
  }

  onClose() {
    this.contentEl.empty();
  }
}
