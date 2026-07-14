import React, { useEffect, useMemo, useState } from "react";
import { App, TFile } from "obsidian";
import { VaultPilotSettings } from "../settings/settings";
import { ProjectInfo } from "../types";
import {
  filterProjectFiles,
  filterActiveProjects,
  getRecentFiles,
} from "../core/scanner";
import { parseOpenTasks } from "../core/taskParser";
import { Suggestion } from "../core/fastConnect";
import { FastConnectPanel } from "./FastConnectPanel";
import { fetchAnalyticsStats, AnalyticsStats } from "../core/analyticsService";

interface Props {
  app: App;
  settings: VaultPilotSettings;
  onOpenCapture: () => void;
  onOpenView: (viewId: string) => void;
  isLoggedIn: boolean;
  userEmail: string;
  vaultId: string;
  onLogin: () => void;
  onLogout: () => void;
  suggestions: Suggestion[];
  isAnalyzing: boolean;
  analyzeProgress: number;
  onAnalyzeNow: () => void;
  onApplySuggestions: (ids: string[]) => Promise<void>;
  onRejectAllSuggestions: () => void;
}

interface DashboardData {
  activeProjects: ProjectInfo[];
  openTaskCount: number;
  inboxCount: number;
  recentFiles: TFile[];
  allFiles: TFile[];
}

function getProjectName(file: TFile, projectsFolder: string): string | null {
  const rel = file.path.slice(projectsFolder.length);
  const parts = rel.split("/");
  return parts.length > 0 ? parts[0] : null;
}

const NAV_ITEMS = [
  { id: "vaultpilot-smart-graph", icon: "🕸", label: "Graph",   shortcut: "⌃⇧G" },
  { id: "vaultpilot-kanban",      icon: "📋", label: "Kanban",  shortcut: "⌃⇧K" },
  { id: "vaultpilot-cleaner",     icon: "🧹", label: "Cleaner", shortcut: "⌃⇧V" },
];

export function DashboardPanel({
  app,
  settings,
  onOpenCapture,
  onOpenView,
  isLoggedIn,
  userEmail,
  vaultId,
  onLogin,
  onLogout,
  suggestions,
  isAnalyzing,
  analyzeProgress,
  onAnalyzeNow,
  onApplySuggestions,
  onRejectAllSuggestions,
}: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [showFastConnect, setShowFastConnect] = useState(false);
  const [query, setQuery] = useState("");

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const allFiles = app.vault.getMarkdownFiles();
      const projectFiles = filterProjectFiles(allFiles, settings.projectsFolder);
      const caches = projectFiles.map((f) => ({
        file: f,
        frontmatter: app.metadataCache.getFileCache(f)?.frontmatter ?? {},
      }));
      const activeProjects = filterActiveProjects(projectFiles, caches);

      let totalTasks = 0;
      for (const file of projectFiles) {
        try {
          const content = await app.vault.read(file);
          totalTasks += parseOpenTasks(content, file).length;
        } catch { /* bestand verwijderd */ }
      }

      const inboxCount = allFiles.filter((f) =>
        f.path.startsWith(settings.inboxFolder)
      ).length;
      const recentFiles = getRecentFiles(allFiles, 5);

      if (!cancelled) {
        setData({ activeProjects, openTaskCount: totalTasks, inboxCount, recentFiles, allFiles });
      }
    };

    load();
    const ref = app.vault.on("modify", load);
    return () => {
      cancelled = true;
      app.vault.offref(ref);
    };
  }, [app, settings]);

  const searchResults = useMemo(() => {
    if (!query.trim() || !data) return [];
    const q = query.toLowerCase();
    return data.allFiles
      .filter((f) => f.basename.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, data]);

  const revealFolder = (folderPath: string) => {
    const explorer = (app as any).internalPlugins?.plugins?.["file-explorer"];
    const folder = app.vault.getAbstractFileByPath(folderPath.replace(/\/$/, ""));
    if (explorer && folder) explorer.instance?.revealInFolder(folder);
  };

  const openOpenTasks = () => {
    const search = (app as any).internalPlugins?.plugins?.["global-search"];
    if (search) search.instance?.openGlobalSearch('task-todo:""');
  };

  if (!data) {
    return <div className="p-4 text-gray-400">Laden...</div>;
  }

  return (
    <div className="p-3 text-sm">

      {/* Zoekbalk */}
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="🔍  Zoek in vault..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery("");
            if (e.key === "Enter" && searchResults.length > 0) {
              app.workspace.openLinkText(searchResults[0].basename, "", false);
              setQuery("");
            }
          }}
          className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none"
        />
        {searchResults.length > 0 && (
          <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg overflow-hidden">
            {searchResults.map((f) => (
              <div
                key={f.path}
                className="px-3 py-1.5 cursor-pointer hover:bg-gray-700 flex justify-between items-center"
                onClick={() => { app.workspace.openLinkText(f.basename, "", false); setQuery(""); }}
              >
                <span className="text-xs text-gray-200 truncate">{f.basename}</span>
                <span className="text-xs text-gray-500 ml-2 shrink-0 truncate">{f.path.split("/").slice(0, -1).join("/")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigatieknoppen */}
      <div className="grid grid-cols-3 gap-1 mb-3">
        {NAV_ITEMS.map(({ id, icon, label, shortcut }) => (
          <button
            key={id}
            onClick={() => onOpenView(id)}
            className="flex flex-col items-center gap-0.5 py-2 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 transition-colors group"
          >
            <span className="text-base leading-none">{icon}</span>
            <span className="font-medium">{label}</span>
            <span className="text-gray-600 group-hover:text-gray-400 text-[10px] font-mono">{shortcut}</span>
          </button>
        ))}
      </div>

      {/* Quick actions rij */}
      <div className="grid grid-cols-2 gap-1 mb-4">
        <button
          onClick={onOpenCapture}
          className="flex items-center justify-center gap-1.5 py-1.5 bg-blue-700 hover:bg-blue-600 rounded text-xs text-white transition-colors"
        >
          <span>✏️</span>
          <span>Vastleggen</span>
          <span className="text-blue-300 font-mono text-[10px]">⌃⇧C</span>
        </button>
        <button
          onClick={() => { onAnalyzeNow(); setShowFastConnect(true); }}
          disabled={isAnalyzing}
          className="flex items-center justify-center gap-1.5 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded text-xs text-gray-200 transition-colors"
        >
          <span>⚡</span>
          <span>{isAnalyzing ? `${analyzeProgress}%` : "Fast Connect"}</span>
          <span className="text-gray-500 font-mono text-[10px]">⌃⇧F</span>
        </button>
      </div>

      {/* Auth status */}
      {isLoggedIn ? (
        <div className="flex items-center justify-between px-3 py-1.5 mb-3 bg-green-900 rounded text-xs">
          <span className="text-green-300">✓ {userEmail}</span>
          <button onClick={onLogout} className="text-green-500 hover:text-red-400 transition-colors">
            Uitloggen
          </button>
        </div>
      ) : (
        <button
          onClick={onLogin}
          className="w-full mb-3 flex items-center justify-center gap-2 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-blue-500 rounded text-xs text-gray-400 hover:text-blue-300 transition-colors"
        >
          <span>🔗</span>
          <span>Verbinden met VaultPilot Pro</span>
        </button>
      )}

      {/* Vault Analytics — alleen zichtbaar wanneer ingelogd */}
      {isLoggedIn && vaultId && (
        <AnalyticsBlock vaultId={vaultId} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard label="Projecten" value={data.activeProjects.length} color="blue"
          onClick={() => revealFolder(settings.projectsFolder)} />
        <StatCard label="Open taken" value={data.openTaskCount} color="red"
          onClick={openOpenTasks} />
        <StatCard label="Inbox" value={data.inboxCount} color="green"
          onClick={() => revealFolder(settings.inboxFolder)} />
      </div>

      {/* Fast Connect badge */}
      {pendingCount > 0 && (
        <button
          onClick={() => setShowFastConnect(true)}
          className="w-full mb-3 flex items-center justify-between px-3 py-2 bg-yellow-900 hover:bg-yellow-800 rounded text-xs transition-colors"
        >
          <span className="text-yellow-300">⚡ {pendingCount} verbandssuggesties klaar</span>
          <span className="text-yellow-400">Bekijk →</span>
        </button>
      )}

      <Section title="Actieve Projecten">
        {data.activeProjects.length === 0 ? (
          <p className="text-gray-500 px-3 py-2">Geen actieve projecten gevonden.</p>
        ) : (
          data.activeProjects.map((p) => (
            <FileRow key={p.path} label={p.name}
              onClick={() => app.workspace.openLinkText(p.name, "", false)} />
          ))
        )}
      </Section>

      <Section title="Recent Gewijzigd">
        {data.recentFiles.map((f) => {
          const project = getProjectName(f, settings.projectsFolder);
          return (
            <FileRow key={f.path} label={f.basename}
              sub={project ? `${project} · ${timeSince(f.stat.mtime)}` : timeSince(f.stat.mtime)}
              onClick={() => app.workspace.openLinkText(f.basename, "", false)} />
          );
        })}
      </Section>

      {showFastConnect && (
        <FastConnectPanel
          app={app}
          suggestions={suggestions}
          isAnalyzing={isAnalyzing}
          analyzeProgress={analyzeProgress}
          hasGroqKey={!!settings.groqApiKey}
          onAnalyzeNow={onAnalyzeNow}
          onApply={async (ids) => {
            await onApplySuggestions(ids);
            if (suggestions.filter((s) => s.status === "pending").length === 0) {
              setShowFastConnect(false);
            }
          }}
          onRejectAll={() => { onRejectAllSuggestions(); setShowFastConnect(false); }}
          onClose={() => setShowFastConnect(false)}
        />
      )}
    </div>
  );
}

function AnalyticsBlock({ vaultId }: { vaultId: string }) {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const s = await fetchAnalyticsStats(vaultId);
      if (!cancelled) {
        setStats(s);
        setLoading(false);
      }
    };

    load();
    // Refresh elke 5 minuten
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [vaultId]);

  if (loading) {
    return (
      <div className="mb-3 px-3 py-2 bg-gray-800 rounded text-xs text-gray-500">
        Analytics laden…
      </div>
    );
  }

  if (!stats) return null;

  const folderLabel = stats.mostActiveFolder
    ? stats.mostActiveFolder.replace(/\/$/, "").split("/").pop() ?? stats.mostActiveFolder
    : null;

  return (
    <div className="mb-3">
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Vault Analytics — 7 dagen</div>
      <div className="bg-gray-800 rounded p-2 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-purple-400">{stats.notesModifiedThisWeek}</div>
          <div className="text-[10px] text-gray-400 leading-tight">notities gewijzigd</div>
        </div>
        <div>
          <div className="text-lg font-bold text-cyan-400">{stats.activeDaysThisWeek}</div>
          <div className="text-[10px] text-gray-400 leading-tight">actieve dagen</div>
        </div>
        <div>
          <div className="text-lg font-bold text-orange-400 truncate">{folderLabel ?? "—"}</div>
          <div className="text-[10px] text-gray-400 leading-tight">meest actief</div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, onClick }: {
  label: string; value: number; color: "blue" | "red" | "green"; onClick?: () => void;
}) {
  const colors = { blue: "text-blue-400", red: "text-red-400", green: "text-green-400" };
  return (
    <div className={`bg-gray-800 rounded p-2 text-center ${onClick ? "cursor-pointer hover:bg-gray-700" : ""}`}
      onClick={onClick}>
      <div className={`text-xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">{title}</div>
      <div className="bg-gray-800 rounded overflow-hidden">{children}</div>
    </div>
  );
}

function FileRow({ label, sub, onClick }: { label: string; sub?: string; onClick: () => void }) {
  return (
    <div className="px-3 py-2 border-b border-gray-700 last:border-0 cursor-pointer hover:bg-gray-700 flex justify-between items-center"
      onClick={onClick}>
      <span className="truncate">{label}</span>
      {sub && <span className="text-xs text-gray-500 ml-2 shrink-0">{sub}</span>}
    </div>
  );
}

function timeSince(mtime: number): string {
  const diff = Date.now() - mtime;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "zojuist";
  if (minutes < 60) return `${minutes}m geleden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}u geleden`;
  return `${Math.floor(hours / 24)}d geleden`;
}
