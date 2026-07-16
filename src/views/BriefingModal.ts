import { App, Modal, TFile } from "obsidian";
import { VaultPilotSettings } from "../settings/settings";
import { parseKanbanTasks } from "../core/kanbanParser";

interface ProjectBrief {
  name: string;
  folder: string;
  openTasks: string[];
  recentFile: TFile;
}

export class BriefingModal extends Modal {
  private settings: VaultPilotSettings;
  private groqKey: string;

  constructor(app: App, settings: VaultPilotSettings) {
    super(app);
    this.settings = settings;
    this.groqKey = settings.groqApiKey;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("vaultpilot-briefing");

    // Header
    const today = new Date();
    const dateStr = today.toLocaleDateString("nl-NL", {
      weekday: "long", day: "numeric", month: "long",
    });

    contentEl.createEl("div", { cls: "briefing-header" }, (el) => {
      el.createEl("div", { text: "🌅 Dagelijkse Briefing", cls: "briefing-title" });
      el.createEl("div", { text: dateStr, cls: "briefing-date" });
    });

    // Loading
    const body = contentEl.createEl("div", { cls: "briefing-body" });
    const loadingEl = body.createEl("div", { text: "Brief laden…", cls: "briefing-loading" });

    try {
      const briefs = await this.buildBriefs();
      loadingEl.remove();

      if (briefs.length === 0) {
        body.createEl("p", { text: "Geen actieve projecten met taken gevonden.", cls: "briefing-empty" });
        return;
      }

      for (const brief of briefs) {
        const section = body.createEl("div", { cls: "briefing-project" });
        section.createEl("div", { text: brief.name, cls: "briefing-project-name" });
        section.createEl("div", {
          text: `Recentst gewijzigd: ${brief.recentFile.basename}`,
          cls: "briefing-project-recent",
        });

        if (brief.openTasks.length === 0) {
          section.createEl("div", { text: "Geen open taken", cls: "briefing-no-tasks" });
        } else {
          const list = section.createEl("ul", { cls: "briefing-task-list" });
          for (const task of brief.openTasks.slice(0, 8)) {
            list.createEl("li", { text: task, cls: "briefing-task" });
          }
          if (brief.openTasks.length > 8) {
            list.createEl("li", {
              text: `+${brief.openTasks.length - 8} meer`,
              cls: "briefing-task-more",
            });
          }
        }

        // Open project link
        section.createEl("button", { text: "Open project →", cls: "briefing-open-btn" }).onclick = () => {
          this.app.workspace.openLinkText(brief.recentFile.basename, "", false);
          this.close();
        };
      }

      // AI samenvatting
      if (this.groqKey && briefs[0].openTasks.length > 0) {
        const aiSection = body.createEl("div", { cls: "briefing-ai" });
        const aiBtn = aiSection.createEl("button", {
          text: "✨ Genereer AI-samenvatting",
          cls: "briefing-ai-btn",
        });
        aiBtn.onclick = async () => {
          aiBtn.textContent = "Laden…";
          aiBtn.disabled = true;
          const summary = await this.generateSummary(briefs);
          aiBtn.remove();
          const summaryEl = aiSection.createEl("div", { cls: "briefing-ai-summary" });
          summaryEl.createEl("div", { text: "✨ AI-samenvatting", cls: "briefing-ai-label" });
          summaryEl.createEl("p", { text: summary, cls: "briefing-ai-text" });
        };
      }
    } catch (e) {
      loadingEl.textContent = `Fout: ${(e as Error).message}`;
    }
  }

  private async buildBriefs(): Promise<ProjectBrief[]> {
    const allFiles = this.app.vault.getMarkdownFiles();
    const projectFiles = allFiles.filter((f) =>
      f.path.startsWith(this.settings.projectsFolder)
    );

    // Groepeer per top-level project map
    const byProject = new Map<string, TFile[]>();
    for (const f of projectFiles) {
      const rel = f.path.slice(this.settings.projectsFolder.length);
      const project = rel.split("/")[0];
      if (!project) continue;
      if (!byProject.has(project)) byProject.set(project, []);
      byProject.get(project)!.push(f);
    }

    // Sorteer projecten op meest recent gewijzigd
    const sorted = [...byProject.entries()]
      .map(([name, files]) => {
        const mostRecent = files.sort((a, b) => b.stat.mtime - a.stat.mtime)[0];
        return { name, files, mostRecent };
      })
      .sort((a, b) => b.mostRecent.stat.mtime - a.mostRecent.stat.mtime)
      .slice(0, 3);

    const briefs: ProjectBrief[] = [];
    for (const { name, files, mostRecent } of sorted) {
      const openTasks: string[] = [];
      for (const file of files) {
        try {
          const content = await this.app.vault.read(file);
          const tasks = parseKanbanTasks(content, file)
            .filter((t) => t.status === "todo" || t.status === "doing")
            .map((t) => t.text);
          openTasks.push(...tasks);
        } catch { /* overslaan */ }
      }
      briefs.push({
        name,
        folder: this.settings.projectsFolder + name + "/",
        openTasks,
        recentFile: mostRecent,
      });
    }

    return briefs;
  }

  private async generateSummary(briefs: ProjectBrief[]): Promise<string> {
    const lines = briefs.map((b) => {
      const tasks = b.openTasks.slice(0, 5).map((t) => `- ${t}`).join("\n");
      return `**${b.name}**:\n${tasks || "Geen open taken"}`;
    }).join("\n\n");

    const prompt = `Je bent een productiviteitsassistent. Geef een beknopte dagelijkse briefing (max 3 zinnen) op basis van deze projectoverzichten:\n\n${lines}\n\nFocus op wat het belangrijkst is voor vandaag.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.5,
      }),
    });

    const json = await res.json() as any;
    return json.choices?.[0]?.message?.content ?? "Kon geen samenvatting genereren.";
  }

  onClose() {
    this.contentEl.empty();
  }
}
