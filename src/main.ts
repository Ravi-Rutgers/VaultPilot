import { Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, VaultPilotSettings } from "./settings/settings";
import { getSupabase, signOut } from "./core/supabaseClient";
import { trackEvent } from "./core/analyticsService";
import { syncVaultToCloud } from "./core/webCompanion";
import { LoginModal } from "./views/LoginModal";
import { BriefingModal } from "./views/BriefingModal";
import { AiActionsModal } from "./views/AiActionsModal";
import { ClaudeChatModal } from "./views/ClaudeChatModal";
import { Session } from "@supabase/supabase-js";
import { VaultPilotSettingsTab } from "./settings/SettingsTab";
import { DashboardView, VIEW_TYPE_DASHBOARD } from "./views/DashboardView";
import { CleanerView, VIEW_TYPE_CLEANER } from "./views/CleanerView";
import { KanbanView, VIEW_TYPE_KANBAN } from "./views/KanbanView";
import { SmartGraphView, VIEW_TYPE_GRAPH } from "./views/SmartGraphView";
import { CaptureModal } from "./views/CaptureModal";
import { BackgroundAnalyzer } from "./core/backgroundAnalyzer";
import {
  Suggestion,
  fetchGroqSuggestions,
  deduplicateSuggestions,
  wikilinkLine,
} from "./core/fastConnect";

export default class VaultPilotPlugin extends Plugin {
  settings: VaultPilotSettings = DEFAULT_SETTINGS;
  suggestions: Suggestion[] = [];
  isAnalyzing = false;
  analyzeProgress = 0;

  private backgroundAnalyzer: BackgroundAnalyzer | null = null;
  private modifyDebounce = new Map<string, ReturnType<typeof setTimeout>>();
  private syncDebounce: ReturnType<typeof setTimeout> | null = null;

  async onload() {
    await this.loadSettings();

    // Suggesties worden geladen in loadSettings()

    this.registerView(
      VIEW_TYPE_DASHBOARD,
      (leaf) => new DashboardView(leaf, this)
    );
    this.registerView(
      VIEW_TYPE_CLEANER,
      (leaf) => new CleanerView(leaf, this)
    );
    this.registerView(
      VIEW_TYPE_KANBAN,
      (leaf) => new KanbanView(leaf, this)
    );
    this.registerView(
      VIEW_TYPE_GRAPH,
      (leaf) => new SmartGraphView(leaf, this)
    );

    this.addRibbonIcon("layout-dashboard", "VaultPilot Dashboard", () => {
      this.activateView(VIEW_TYPE_DASHBOARD);
    });

    this.addRibbonIcon("columns", "VaultPilot Kanban", () => {
      this.activateView(VIEW_TYPE_KANBAN);
    });

    this.addCommand({
      id: "open-dashboard",
      name: "Open Dashboard",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "d" }],
      callback: () => this.activateView(VIEW_TYPE_DASHBOARD),
    });

    this.addCommand({
      id: "open-cleaner",
      name: "Vault Cleaner openen",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "v" }],
      callback: () => this.activateView(VIEW_TYPE_CLEANER),
    });

    this.addCommand({
      id: "open-kanban",
      name: "Kanban Board openen",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "k" }],
      callback: () => this.activateView(VIEW_TYPE_KANBAN),
    });

    this.addCommand({
      id: "open-graph",
      name: "Smart Graph openen",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "g" }],
      callback: () => this.activateView(VIEW_TYPE_GRAPH),
    });

    this.addCommand({
      id: "quick-capture",
      name: "Quick Capture",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "c" }],
      callback: () => new CaptureModal(this.app, this.settings).open(),
    });

    this.addCommand({
      id: "fast-connect-analyze",
      name: "Fast Connect: Analyseer vault",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "f" }],
      callback: () => this.analyzeNow(),
    });

    this.addCommand({
      id: "fast-connect-open",
      name: "Fast Connect: Bekijk suggesties",
      callback: () => {
        this.activateView(VIEW_TYPE_DASHBOARD);
      },
    });

    this.addCommand({
      id: "daily-briefing",
      name: "Dagelijkse Briefing openen",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "b" }],
      callback: () => new BriefingModal(this.app, this.settings).open(),
    });

    this.addCommand({
      id: "claude-chat",
      name: "Claude Chat openen",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "e" }],
      callback: () => {
        if (!this.settings.claudeApiKey) {
          new Notice("Stel eerst een Claude API-sleutel in via Instellingen → VaultPilot.");
          return;
        }
        new ClaudeChatModal(this.app, this.settings).open();
      },
    });

    this.addCommand({
      id: "ai-actions",
      name: "AI Quick Actions op actieve notitie",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "a" }],
      callback: async () => {
        if (!this.settings.groqApiKey) {
          new Notice("Stel eerst een Groq API-sleutel in via Instellingen → VaultPilot.");
          return;
        }
        const file = this.app.workspace.getActiveFile();
        if (!file) {
          new Notice("Geen actieve notitie geopend.");
          return;
        }
        const content = await this.app.vault.read(file);
        new AiActionsModal(this.app, file, content, this.settings.groqApiKey).open();
      },
    });

    this.addSettingTab(new VaultPilotSettingsTab(this.app, this));

    this.backgroundAnalyzer = new BackgroundAnalyzer(
      this.app,
      this.settings,
      () => this.suggestions,
      (s) => {
        this.suggestions = s;
        this.saveSuggestions(s);
        this.refreshDashboard();
      }
    );

    this.app.workspace.onLayoutReady(async () => {
      // Herstel Supabase sessie als er een opgeslagen token is
      if (this.settings.accessToken && this.settings.refreshToken) {
        await getSupabase().auth.setSession({
          access_token: this.settings.accessToken,
          refresh_token: this.settings.refreshToken,
        });
      }

      if (this.isLoggedIn) {
        trackEvent(this.settings.vaultId, "vault_opened", {
          vault: this.app.vault.getName(),
        });
        this.triggerCloudSync();
      }

      this.registerVaultModifyTracking();
      this.activateView(VIEW_TYPE_DASHBOARD);
      this.backgroundAnalyzer?.start();
    });
  }

  onunload() {
    this.backgroundAnalyzer?.stop();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DASHBOARD);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CLEANER);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_KANBAN);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_GRAPH);
  }

  async loadSettings() {
    const data = await this.loadData() ?? {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    this.suggestions = data.suggestions ?? [];
  }

  async saveSettings() {
    const data = await this.loadData() ?? {};
    await this.saveData({ ...data, ...this.settings });
  }

  private async saveSuggestions(suggestions: Suggestion[]): Promise<void> {
    const data = await this.loadData() ?? {};
    await this.saveData({ ...data, suggestions });
  }

  refreshDashboard(): void {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD);
    for (const leaf of leaves) {
      (leaf.view as DashboardView).rerender();
    }
  }

  async analyzeNow(): Promise<void> {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;
    this.analyzeProgress = 0;
    this.refreshDashboard();
    if (this.isLoggedIn) trackEvent(this.settings.vaultId, "fast_connect_used");

    // Stap 1: regel-gebaseerde analyse
    await this.backgroundAnalyzer?.runOnce();
    this.analyzeProgress = 30;
    this.refreshDashboard();

    // Stap 2: Groq AI (alleen als sleutel aanwezig)
    if (this.settings.groqApiKey) {
      const files = this.app.vault
        .getMarkdownFiles()
        .map((f) => ({ path: f.path, basename: f.basename }));

      const fileContents: Record<string, string> = {};
      await Promise.all(
        files.map(async (f) => {
          try {
            const tf = this.app.vault.getFileByPath(f.path);
            if (tf) fileContents[f.path] = await this.app.vault.read(tf);
          } catch { /* overslaan */ }
        })
      );

      const aiSuggestions = await fetchGroqSuggestions(
        files,
        fileContents,
        this.app.metadataCache.resolvedLinks,
        this.settings.groqApiKey,
        (done, total) => {
          this.analyzeProgress = 30 + Math.round((done / total) * 70);
          this.refreshDashboard();
        }
      );

      this.suggestions = deduplicateSuggestions(this.suggestions, aiSuggestions);
      await this.saveSuggestions(this.suggestions);
    }

    this.analyzeProgress = 100;
    this.isAnalyzing = false;
    this.refreshDashboard();
  }

  async applySuggestions(ids: string[]): Promise<void> {
    const toApply = this.suggestions.filter((s) => ids.includes(s.id));

    for (const suggestion of toApply) {
      try {
        const file = this.app.vault.getFileByPath(suggestion.source);
        if (!file) continue;
        const content = await this.app.vault.read(file);
        if (content.includes(`[[${suggestion.targetBasename}]]`)) {
          suggestion.status = "accepted";
          continue;
        }
        await this.app.vault.modify(file, content + wikilinkLine(suggestion.targetBasename));
        suggestion.status = "accepted";
      } catch { /* bestand verwijderd, overslaan */ }
    }

    await this.saveSuggestions(this.suggestions);
    if (this.isLoggedIn) {
      trackEvent(this.settings.vaultId, "fast_connect_applied", { count: ids.length });
    }
    this.refreshDashboard();
  }

  rejectAllSuggestions(): void {
    for (const s of this.suggestions) {
      if (s.status === "pending") s.status = "rejected";
    }
    this.saveSuggestions(this.suggestions);
    this.refreshDashboard();
  }

  private registerVaultModifyTracking() {
    this.registerEvent(
      this.app.vault.on("modify", (file: TFile) => {
        if (!this.isLoggedIn) return;

        // Analytics tracking (debounce 30s per bestand)
        const existing = this.modifyDebounce.get(file.path);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          this.modifyDebounce.delete(file.path);
          const folder = file.path.includes("/")
            ? file.path.slice(0, file.path.lastIndexOf("/") + 1)
            : "";
          trackEvent(this.settings.vaultId, "note_modified", { path: file.path, folder });
        }, 30_000);
        this.modifyDebounce.set(file.path, timer);

        // Cloud sync (debounce 60s — wacht tot burst van wijzigingen klaar is)
        this.triggerCloudSync(60_000);
      })
    );
  }

  triggerCloudSync(delay = 0) {
    if (this.syncDebounce) clearTimeout(this.syncDebounce);
    this.syncDebounce = setTimeout(() => {
      this.syncDebounce = null;
      syncVaultToCloud(
        this.app,
        this.settings.vaultId,
        this.settings.projectsFolder,
        this.settings.inboxFolder
      );
    }, delay);
  }

  get isLoggedIn(): boolean {
    return !!this.settings.accessToken && !!this.settings.userEmail;
  }

  openLoginModal() {
    const vaultName = this.app.vault.getName();
    new LoginModal(this.app, vaultName, async (session: Session, vaultId: string) => {
      this.settings.userEmail = session.user.email ?? "";
      this.settings.vaultId = vaultId;
      this.settings.accessToken = session.access_token;
      this.settings.refreshToken = session.refresh_token;
      await this.saveSettings();

      // Herstel sessie in Supabase client
      await getSupabase().auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      this.refreshDashboard();
    }).open();
  }

  async logout() {
    await signOut();
    this.settings.userEmail = "";
    this.settings.vaultId = "";
    this.settings.accessToken = "";
    this.settings.refreshToken = "";
    await this.saveSettings();
    this.refreshDashboard();
  }

  async openView(viewType: string) {
    await this.activateView(viewType);
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
