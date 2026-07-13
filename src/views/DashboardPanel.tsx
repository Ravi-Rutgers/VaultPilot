import React, { useEffect, useState } from "react";
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

interface Props {
  app: App;
  settings: VaultPilotSettings;
  onOpenCapture: () => void;
  onOpenView: (viewId: string) => void;
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
}

function getProjectName(file: TFile, projectsFolder: string): string | null {
  const rel = file.path.slice(projectsFolder.length);
  const parts = rel.split("/");
  return parts.length > 0 ? parts[0] : null;
}

export function DashboardPanel({
  app,
  settings,
  onOpenCapture,
  onOpenView,
  suggestions,
  isAnalyzing,
  analyzeProgress,
  onAnalyzeNow,
  onApplySuggestions,
  onRejectAllSuggestions,
}: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [showFastConnect, setShowFastConnect] = useState(false);

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
        } catch {
          // bestand kan verwijderd zijn tussen listing en lezen
        }
      }

      const inboxCount = allFiles.filter((f) =>
        f.path.startsWith(settings.inboxFolder)
      ).length;
      const recentFiles = getRecentFiles(allFiles, 5);

      if (!cancelled) {
        setData({ activeProjects, openTaskCount: totalTasks, inboxCount, recentFiles });
      }
    };

    load();
    const ref = app.vault.on("modify", load);
    return () => {
      cancelled = true;
      app.vault.offref(ref);
    };
  }, [app, settings]);

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
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-500 uppercase tracking-wider">VaultPilot</span>
        <button
          onClick={onOpenCapture}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          + Vastleggen
        </button>
      </div>

      {/* Navigatie naar andere views */}
      <div className="grid grid-cols-3 gap-1 mb-4">
        {[
          { id: "vaultpilot-smart-graph", icon: "🕸", label: "Graph" },
          { id: "vaultpilot-kanban", icon: "📋", label: "Kanban" },
          { id: "vaultpilot-cleaner", icon: "🧹", label: "Cleaner" },
        ].map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => onOpenView(id)}
            className="flex flex-col items-center gap-0.5 py-2 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 transition-colors"
          >
            <span className="text-base leading-none">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard
          label="Projecten"
          value={data.activeProjects.length}
          color="blue"
          onClick={() => revealFolder(settings.projectsFolder)}
        />
        <StatCard label="Open taken" value={data.openTaskCount} color="red" onClick={openOpenTasks} />
        <StatCard label="Inbox" value={data.inboxCount} color="green" onClick={() => revealFolder(settings.inboxFolder)} />
      </div>

      <Section title="Actieve Projecten">
        {data.activeProjects.length === 0 ? (
          <p className="text-gray-500 px-3 py-2">Geen actieve projecten gevonden.</p>
        ) : (
          data.activeProjects.map((p) => (
            <FileRow
              key={p.path}
              label={p.name}
              onClick={() => app.workspace.openLinkText(p.name, "", false)}
            />
          ))
        )}
      </Section>

      <Section title="Recent Gewijzigd">
        {data.recentFiles.map((f) => {
          const project = getProjectName(f, settings.projectsFolder);
          return (
            <FileRow
              key={f.path}
              label={f.basename}
              sub={project ? `${project} · ${timeSince(f.stat.mtime)}` : timeSince(f.stat.mtime)}
              onClick={() => app.workspace.openLinkText(f.basename, "", false)}
            />
          );
        })}
      </Section>

      <Section title="⚡ Fast Connect">
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {isAnalyzing
              ? `Analyseren... ${analyzeProgress}%`
              : pendingCount > 0
              ? `${pendingCount} suggestie${pendingCount !== 1 ? "s" : ""} klaar`
              : "Geen openstaande suggesties"}
          </span>
          <div className="flex gap-2">
            {pendingCount > 0 && (
              <button
                onClick={() => setShowFastConnect(true)}
                className="text-xs px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded"
              >
                Bekijk ({pendingCount})
              </button>
            )}
            <button
              onClick={() => { onAnalyzeNow(); setShowFastConnect(true); }}
              disabled={isAnalyzing}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 rounded"
            >
              {isAnalyzing ? "Bezig..." : "Analyseer nu"}
            </button>
          </div>
        </div>
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

function StatCard({
  label,
  value,
  color,
  onClick,
}: {
  label: string;
  value: number;
  color: "blue" | "red" | "green";
  onClick?: () => void;
}) {
  const colors = { blue: "text-blue-400", red: "text-red-400", green: "text-green-400" };
  return (
    <div
      className={`bg-gray-800 rounded p-2 text-center ${onClick ? "cursor-pointer hover:bg-gray-700" : ""}`}
      onClick={onClick}
    >
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
    <div
      className="px-3 py-2 border-b border-gray-700 last:border-0 cursor-pointer hover:bg-gray-700 flex justify-between items-center"
      onClick={onClick}
    >
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
