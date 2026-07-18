import { App } from "obsidian";
import { VaultPilotSettings } from "../settings/settings";
import { parseKanbanTasks, appendTaskToContent, updateTaskStatus, KanbanStatus } from "./kanbanParser";

const TOOLS = [
  {
    name: "list_tasks",
    description: "Toon taken uit de vault. Filter optioneel op project of status.",
    input_schema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Projectnaam om op te filteren (optioneel)" },
        status: { type: "string", enum: ["todo", "doing", "done"], description: "Status filter (optioneel)" },
      },
    },
  },
  {
    name: "create_task",
    description: "Maak een nieuwe taak aan in een projectbestand.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Taakomschrijving" },
        project: { type: "string", description: "Projectnaam (map in projects/)" },
        status: { type: "string", enum: ["todo", "doing", "done"], description: "Beginstatus, standaard 'todo'" },
      },
      required: ["text", "project"],
    },
  },
  {
    name: "update_task",
    description: "Wijzig de status van een bestaande taak.",
    input_schema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Bestandspad in de vault" },
        line_number: { type: "number", description: "Regelnummer (0-gebaseerd)" },
        new_status: { type: "string", enum: ["todo", "doing", "done"] },
      },
      required: ["file_path", "line_number", "new_status"],
    },
  },
  {
    name: "get_vault_summary",
    description: "Haal een overzicht op van alle projecten met taakaantallen per status.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "create_note",
    description: "Maak een nieuwe notitie aan in de vault. Kies de juiste map op basis van de inhoud: inbox/ (ongesorteerd/snel), ideas/ (ideeën), projects/<naam>/ (projectgerelateerd), daily/ (dagelijkse gedachten), research/ (referenties/docs), personal/ (persoonlijk).",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Titel van de notitie (wordt ook de bestandsnaam)" },
        content: { type: "string", description: "Inhoud van de notitie in Markdown" },
        folder: { type: "string", description: "Map waar de notitie opgeslagen wordt, bijv. 'ideas/', 'inbox/', 'projects/VaultPilot/', 'personal/'" },
        tags: { type: "array", items: { type: "string" }, description: "Optionele tags voor frontmatter" },
      },
      required: ["title", "content", "folder"],
    },
  },
  {
    name: "append_to_note",
    description: "Voeg inhoud toe aan het einde van een bestaande notitie.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Bestandspad van de notitie in de vault" },
        content: { type: "string", description: "Toe te voegen inhoud (Markdown)" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "search_vault",
    description: "Zoek door alle notities in de vault op trefwoord. Geeft bestandspaden + relevante fragmenten terug.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Zoekterm" },
        folder: { type: "string", description: "Beperk zoekactie tot een map (optioneel)" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_notes",
    description: "Toon een lijst van notities in een map.",
    input_schema: {
      type: "object",
      properties: {
        folder: { type: "string", description: "Map om te tonen, bijv. 'inbox/', 'ideas/', 'projects/'" },
      },
      required: ["folder"],
    },
  },
];

const SYSTEM_PROMPT = `Je bent VaultPilot AI — het brein van de vault van de gebruiker. Je bent ingebouwd in Obsidian en hebt volledige lees- en schrijftoegang tot de vault.

Vault-structuur:
- inbox/     → Dropzone, alles nieuws
- ideas/     → Ideeën, snelle captures
- projects/  → Actieve projecten met taken
- daily/     → Dagelijkse notities
- research/  → Referenties, docs, rabbit holes
- personal/  → Persoonlijk, niet-werk
- archive/   → Afgerond werk

Gedragsregels:
- Sla informatie die de gebruiker deelt altijd proactief op in de juiste map
- Gebruik create_note voor nieuwe info, append_to_note om iets toe te voegen aan bestaande notities
- Gebruik search_vault als de gebruiker iets wil terugvinden
- Antwoord altijd in het Nederlands
- Wees beknopt — bevestig wat je hebt opgeslagen, maar houd het kort
- Noem bestandspaden alleen als dat nuttig is`;

type ApiTextBlock = { type: "text"; text: string };
type ApiToolUseBlock = { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
type ApiToolResultBlock = { type: "tool_result"; tool_use_id: string; content: string };
type ApiContentBlock = ApiTextBlock | ApiToolUseBlock | ApiToolResultBlock;

type ApiMessage = { role: "user" | "assistant"; content: string | ApiContentBlock[] };

export class ClaudeService {
  private apiMessages: ApiMessage[] = [];

  constructor(private app: App, private settings: VaultPilotSettings) {}

  resetHistory() {
    this.apiMessages = [];
  }

  async sendMessage(
    userText: string,
    onToolUsed?: (summary: string) => void,
  ): Promise<string> {
    this.apiMessages.push({ role: "user", content: userText });

    for (let round = 0; round < 8; round++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": this.settings.claudeApiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: this.apiMessages,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Claude API fout ${res.status}: ${body}`);
      }

      const data = await res.json() as { stop_reason: string; content: ApiContentBlock[] };
      const blocks = data.content ?? [];
      this.apiMessages.push({ role: "assistant", content: blocks });

      if (data.stop_reason === "end_turn") {
        const tb = blocks.find((b): b is ApiTextBlock => b.type === "text");
        return tb?.text ?? "";
      }

      if (data.stop_reason === "tool_use") {
        const toolUses = blocks.filter((b): b is ApiToolUseBlock => b.type === "tool_use");
        const results: ApiToolResultBlock[] = [];

        for (const tu of toolUses) {
          const result = await this.executeTool(tu.name, tu.input);
          onToolUsed?.(this.toolSummary(tu.name, tu.input));
          results.push({ type: "tool_result", tool_use_id: tu.id, content: result });
        }

        this.apiMessages.push({ role: "user", content: results });
      }
    }

    throw new Error("Te veel tool-rondes.");
  }

  private toolSummary(name: string, input: Record<string, unknown>): string {
    switch (name) {
      case "list_tasks": return `Taken gelezen${input.project ? ` (${input.project})` : ""}`;
      case "create_task": return `Taak aangemaakt: "${input.text}" → ${input.project}`;
      case "update_task": return `Taakstatus bijgewerkt → ${input.new_status}`;
      case "get_vault_summary": return "Vault-overzicht opgehaald";
      case "create_note": return `Notitie aangemaakt: "${input.title}" in ${input.folder}`;
      case "append_to_note": return `Toegevoegd aan ${input.path}`;
      case "search_vault": return `Gezocht op "${input.query}"`;
      case "list_notes": return `Notities gelezen uit ${input.folder}`;
      default: return name;
    }
  }

  private async executeTool(name: string, input: Record<string, unknown>): Promise<string> {
    switch (name) {
      case "list_tasks":
        return this.listTasks(input.project as string | undefined, input.status as string | undefined);
      case "create_task":
        return this.createTask(input.text as string, input.project as string, (input.status as KanbanStatus) ?? "todo");
      case "update_task":
        return this.updateTask(input.file_path as string, input.line_number as number, input.new_status as KanbanStatus);
      case "get_vault_summary":
        return this.getVaultSummary();
      case "create_note":
        return this.createNote(input.title as string, input.content as string, input.folder as string, input.tags as string[] | undefined);
      case "append_to_note":
        return this.appendToNote(input.path as string, input.content as string);
      case "search_vault":
        return this.searchVault(input.query as string, input.folder as string | undefined);
      case "list_notes":
        return this.listNotes(input.folder as string);
      default:
        return `Onbekende tool: ${name}`;
    }
  }

  private async listTasks(project?: string, status?: string): Promise<string> {
    const files = this.app.vault.getMarkdownFiles().filter((f) => {
      if (!f.path.startsWith(this.settings.projectsFolder)) return false;
      if (project && !f.path.toLowerCase().includes(project.toLowerCase())) return false;
      return true;
    });

    const lines: string[] = [];
    for (const file of files) {
      try {
        const content = await this.app.vault.read(file);
        const tasks = parseKanbanTasks(content, file)
          .filter((t) => !status || t.status === status);
        for (const t of tasks) {
          lines.push(`[${t.status}] ${t.text} | ${file.path}:${t.lineNumber}`);
        }
      } catch { /* skip */ }
    }

    return lines.length === 0 ? "Geen taken gevonden." : lines.slice(0, 60).join("\n");
  }

  private async createTask(text: string, project: string, status: KanbanStatus = "todo"): Promise<string> {
    const folder = this.settings.projectsFolder + project + "/";
    const files = this.app.vault.getMarkdownFiles().filter((f) => f.path.startsWith(folder));

    let target = files.find((f) => f.basename.toLowerCase() === "notes")
      ?? files.find((f) => f.basename.toLowerCase() === project.toLowerCase())
      ?? files[0];

    if (!target) {
      const path = folder + "tasks.md";
      try { await this.app.vault.createFolder(folder); } catch { /* bestaat al */ }
      target = await this.app.vault.create(path, "# Taken\n");
    }

    const content = await this.app.vault.read(target);
    await this.app.vault.modify(target, appendTaskToContent(content, text, status));
    return `Taak aangemaakt in ${target.path}`;
  }

  private async updateTask(filePath: string, lineNumber: number, newStatus: KanbanStatus): Promise<string> {
    const file = this.app.vault.getFileByPath(filePath);
    if (!file) return `Bestand niet gevonden: ${filePath}`;

    const content = await this.app.vault.read(file);
    const updated = updateTaskStatus(content, lineNumber, newStatus);
    if (updated === content) return `Geen taakmarkering op regel ${lineNumber}.`;

    await this.app.vault.modify(file, updated);
    return `Taak bijgewerkt op ${filePath}:${lineNumber} → ${newStatus}`;
  }

  private async getVaultSummary(): Promise<string> {
    const files = this.app.vault.getMarkdownFiles().filter((f) =>
      f.path.startsWith(this.settings.projectsFolder)
    );

    const counts = new Map<string, { todo: number; doing: number; done: number }>();

    for (const file of files) {
      const rel = file.path.slice(this.settings.projectsFolder.length);
      const project = rel.split("/")[0];
      if (!project) continue;
      if (!counts.has(project)) counts.set(project, { todo: 0, doing: 0, done: 0 });
      const c = counts.get(project)!;

      try {
        const content = await this.app.vault.read(file);
        for (const t of parseKanbanTasks(content, file)) {
          c[t.status]++;
        }
      } catch { /* skip */ }
    }

    if (counts.size === 0) return "Geen projecten gevonden.";

    return [...counts.entries()]
      .sort((a, b) => (b[1].todo + b[1].doing) - (a[1].todo + a[1].doing))
      .map(([name, c]) => `${name}: ${c.todo} todo · ${c.doing} bezig · ${c.done} klaar`)
      .join("\n");
  }

  private async createNote(title: string, content: string, folder: string, tags?: string[]): Promise<string> {
    const normalized = folder.endsWith("/") ? folder : folder + "/";
    const slug = title.replace(/[\\/:*?"<>|]/g, "-").trim();
    const path = normalized + slug + ".md";

    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
    const tagLines = tags?.length ? `tags:\n${tags.map((t) => `  - ${t}`).join("\n")}\n` : "";
    const frontmatter = `---\ncreated: ${dateStr}\n${tagLines}---\n\n`;

    try { await this.app.vault.createFolder(normalized); } catch { /* bestaat al */ }

    const existing = this.app.vault.getFileByPath(path);
    if (existing) {
      const cur = await this.app.vault.read(existing);
      await this.app.vault.modify(existing, cur + "\n\n" + content);
      return `Toegevoegd aan bestaande notitie: ${path}`;
    }

    await this.app.vault.create(path, frontmatter + content);
    return `Notitie aangemaakt: ${path}`;
  }

  private async appendToNote(filePath: string, content: string): Promise<string> {
    const file = this.app.vault.getFileByPath(filePath);
    if (!file) return `Bestand niet gevonden: ${filePath}`;
    const cur = await this.app.vault.read(file);
    await this.app.vault.modify(file, cur.trimEnd() + "\n\n" + content);
    return `Toegevoegd aan ${filePath}`;
  }

  private async searchVault(query: string, folder?: string): Promise<string> {
    const lower = query.toLowerCase();
    const files = this.app.vault.getMarkdownFiles().filter((f) =>
      !folder || f.path.startsWith(folder)
    );

    const hits: string[] = [];
    for (const file of files) {
      try {
        const content = await this.app.vault.read(file);
        if (!content.toLowerCase().includes(lower)) continue;
        const lines = content.split("\n");
        const matching = lines
          .filter((l) => l.toLowerCase().includes(lower))
          .slice(0, 3)
          .map((l) => l.trim());
        hits.push(`${file.path}:\n  ${matching.join("\n  ")}`);
        if (hits.length >= 15) break;
      } catch { /* skip */ }
    }

    return hits.length === 0 ? `Niets gevonden voor "${query}".` : hits.join("\n\n");
  }

  private async listNotes(folder: string): Promise<string> {
    const normalized = folder.endsWith("/") ? folder : folder + "/";
    const files = this.app.vault.getMarkdownFiles()
      .filter((f) => f.path.startsWith(normalized))
      .sort((a, b) => b.stat.mtime - a.stat.mtime)
      .slice(0, 30);

    if (files.length === 0) return `Geen notities gevonden in ${normalized}`;
    return files.map((f) => `${f.basename} (${f.path})`).join("\n");
  }
}
