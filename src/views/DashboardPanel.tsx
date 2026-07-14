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
import { fetchAnalyticsStats, fetchWeeklyActivity, AnalyticsStats, DayActivity } from "../core/analyticsService";

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

  const minConf = settings.fastConnectMinConfidence ?? 0.6;
  const pendingCount = suggestions.filter(
    (s) => s.status === "pending" && s.confidence >= minConf
  ).length;

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
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-xs text-gray-500">Vault laden…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 text-sm">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">V</div>
          <span className="font-semibold text-gray-100 text-sm tracking-tight">VaultPilot</span>
        </div>
        <div className="flex gap-1">
          {NAV_ITEMS.map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => onOpenView(id)}
              title={label}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 text-sm transition-colors"
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Zoekbalk */}
      <div className="relative">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">🔍</div>
        <input
          type="text"
          placeholder="Zoek in vault…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery("");
            if (e.key === "Enter" && searchResults.length > 0) {
              app.workspace.openLinkText(searchResults[0].basename, "", false);
              setQuery("");
            }
          }}
          className="w-full bg-gray-900 ring-1 ring-white/8 focus:ring-indigo-500/50 rounded-lg pl-7 pr-3 py-2 text-xs text-gray-200 placeholder-gray-600 outline-none transition-all"
        />
        {searchResults.length > 0 && (
          <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-gray-900 ring-1 ring-white/10 rounded-lg shadow-xl overflow-hidden">
            {searchResults.map((f) => (
              <div
                key={f.path}
                className="px-3 py-2 cursor-pointer hover:bg-gray-800 flex justify-between items-center gap-3 border-b border-gray-800 last:border-0"
                onClick={() => { app.workspace.openLinkText(f.basename, "", false); setQuery(""); }}
              >
                <span className="text-xs text-gray-200 truncate">{f.basename}</span>
                <span className="text-[10px] text-gray-600 shrink-0 truncate">{f.path.split("/").slice(0, -1).join("/")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onOpenCapture}
          className="flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs text-white font-medium transition-colors shadow-sm"
        >
          <span>✏️</span>
          <span>Vastleggen</span>
          <span className="text-indigo-300 font-mono text-[10px] ml-0.5">⌃⇧C</span>
        </button>
        <button
          onClick={() => { onAnalyzeNow(); setShowFastConnect(true); }}
          disabled={isAnalyzing}
          className="relative flex items-center justify-center gap-1.5 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-60 ring-1 ring-white/8 rounded-lg text-xs text-gray-300 font-medium transition-colors overflow-hidden"
        >
          {isAnalyzing && (
            <div
              className="absolute inset-0 bg-indigo-900/40 origin-left transition-all"
              style={{ transform: `scaleX(${analyzeProgress / 100})` }}
            />
          )}
          <span className="relative">⚡</span>
          <span className="relative">{isAnalyzing ? `${analyzeProgress}%` : "Fast Connect"}</span>
          {!isAnalyzing && <span className="relative text-gray-600 font-mono text-[10px]">⌃⇧F</span>}
        </button>
      </div>

      {/* Auth status */}
      {isLoggedIn ? (
        <div className="flex items-center justify-between px-3 py-2 bg-emerald-950/60 ring-1 ring-emerald-700/30 rounded-lg text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-emerald-300 truncate">{userEmail}</span>
          </div>
          <button
            onClick={onLogout}
            className="text-emerald-600 hover:text-red-400 transition-colors shrink-0 ml-2"
          >
            Uitloggen
          </button>
        </div>
      ) : (
        <button
          onClick={onLogin}
          className="flex items-center justify-center gap-2 py-2 bg-gray-900 hover:bg-gray-800 ring-1 ring-white/8 hover:ring-indigo-500/40 rounded-lg text-xs text-gray-500 hover:text-indigo-300 transition-all"
        >
          <span>🔗</span>
          <span>Verbinden met VaultPilot Pro</span>
        </button>
      )}

      {/* Analytics block */}
      {isLoggedIn && vaultId && <AnalyticsBlock vaultId={vaultId} />}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Projecten" value={data.activeProjects.length} accent="indigo"
          onClick={() => revealFolder(settings.projectsFolder)} />
        <StatCard label="Open taken" value={data.openTaskCount} accent="rose"
          onClick={openOpenTasks} />
        <StatCard label="Inbox" value={data.inboxCount} accent="amber"
          onClick={() => revealFolder(settings.inboxFolder)} />
      </div>

      {/* Fast Connect badge */}
      {pendingCount > 0 && (
        <button
          onClick={() => setShowFastConnect(true)}
          className="flex items-center justify-between px-3 py-2 bg-amber-950/50 hover:bg-amber-900/40 ring-1 ring-amber-700/30 rounded-lg text-xs transition-colors"
        >
          <span className="text-amber-300">⚡ {pendingCount} verbandssuggesties klaar</span>
          <span className="text-amber-500">Bekijk →</span>
        </button>
      )}

      {/* Actieve Projecten */}
      <Section title="Actieve Projecten">
        {data.activeProjects.length === 0 ? (
          <EmptyState>Geen actieve projecten gevonden.</EmptyState>
        ) : (
          data.activeProjects.map((p) => (
            <FileRow key={p.path} label={p.name}
              onClick={() => app.workspace.openLinkText(p.name, "", false)} />
          ))
        )}
      </Section>

      {/* Recent Gewijzigd */}
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
          minConfidence={minConf}
          onApply={async (ids) => {
            await onApplySuggestions(ids);
            if (suggestions.filter((s) => s.status === "pending" && s.confidence >= minConf).length === 0) {
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
  const [activity, setActivity] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [s, a] = await Promise.all([
        fetchAnalyticsStats(vaultId),
        fetchWeeklyActivity(vaultId),
      ]);
      if (!cancelled) { setStats(s); setActivity(a); setLoading(false); }
    };
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [vaultId]);

  if (loading || !stats) return null;

  const folderLabel = stats.mostActiveFolder
    ? stats.mostActiveFolder.replace(/\/$/, "").split("/").pop() ?? stats.mostActiveFolder
    : "—";

  const maxCount = Math.max(...activity.map((d) => d.count), 1);

  return (
    <div className="bg-gray-900 ring-1 ring-white/8 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-widest text-gray-600 mb-2 font-medium">Analytics — 7 dagen</div>
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <AnalyticsStat value={stats.notesModifiedThisWeek} label="gewijzigd" color="text-violet-400" />
        <AnalyticsStat value={stats.activeDaysThisWeek} label="actieve dagen" color="text-cyan-400" />
        <div>
          <div className="text-sm font-semibold text-orange-400 truncate leading-tight">{folderLabel}</div>
          <div className="text-[10px] text-gray-600 mt-0.5">meest actief</div>
        </div>
      </div>
      {activity.length > 0 && (
        <div className="flex items-end gap-1 h-12">
          {activity.map((d, i) => {
            const h = maxCount > 0 ? Math.max(Math.round((d.count / maxCount) * 40), d.count > 0 ? 3 : 0) : 0;
            const isToday = i === activity.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                <div
                  className={`w-full rounded-sm transition-all ${isToday ? "bg-indigo-500" : "bg-gray-700"}`}
                  style={{ height: `${h}px` }}
                  title={`${d.date}: ${d.count} events`}
                />
                <span className={`text-[9px] ${isToday ? "text-indigo-400" : "text-gray-600"}`}>{d.date}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AnalyticsStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <div className={`text-lg font-bold leading-tight ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-600 mt-0.5">{label}</div>
    </div>
  );
}

function StatCard({ label, value, accent, onClick }: {
  label: string;
  value: number;
  accent: "indigo" | "rose" | "amber";
  onClick?: () => void;
}) {
  const bar: Record<string, string> = {
    indigo: "bg-indigo-500",
    rose: "bg-rose-500",
    amber: "bg-amber-500",
  };
  const num: Record<string, string> = {
    indigo: "text-indigo-300",
    rose: "text-rose-300",
    amber: "text-amber-300",
  };
  return (
    <div
      className={`bg-gray-900 ring-1 ring-white/8 rounded-lg p-2.5 text-center ${onClick ? "cursor-pointer hover:bg-gray-800 transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className={`w-6 h-0.5 ${bar[accent]} rounded-full mx-auto mb-2`} />
      <div className={`text-xl font-bold leading-none ${num[accent]}`}>{value}</div>
      <div className="text-[10px] text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-0.5 h-3 bg-indigo-500 rounded-full" />
        <div className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">{title}</div>
      </div>
      <div className="bg-gray-900 ring-1 ring-white/8 rounded-lg overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function FileRow({ label, sub, onClick }: { label: string; sub?: string; onClick: () => void }) {
  return (
    <div
      className="px-3 py-2.5 border-b border-gray-800 last:border-0 cursor-pointer hover:bg-gray-800 flex justify-between items-center gap-3 transition-colors"
      onClick={onClick}
    >
      <span className="text-xs text-gray-300 truncate">{label}</span>
      {sub && <span className="text-[10px] text-gray-600 shrink-0">{sub}</span>}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-4 text-center text-xs text-gray-600">{children}</div>
  );
}

function timeSince(mtime: number): string {
  const diff = Date.now() - mtime;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "zojuist";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}u`;
  return `${Math.floor(hours / 24)}d`;
}
