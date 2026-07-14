import React, { useEffect, useState } from "react";
import { App, Notice } from "obsidian";
import { VaultPilotSettings } from "../settings/settings";
import { ProjectInfo } from "../types";
import { filterProjectFiles, filterActiveProjects } from "../core/scanner";
import {
  KanbanTask,
  KanbanStatus,
  parseKanbanTasks,
  updateTaskStatus,
  nextStatus,
} from "../core/kanbanParser";

interface Props {
  app: App;
  settings: VaultPilotSettings;
}

const COLUMNS: {
  status: KanbanStatus;
  label: string;
  accent: string;
  dot: string;
  empty: string;
}[] = [
  {
    status: "todo",
    label: "Te doen",
    accent: "border-gray-600",
    dot: "bg-gray-500",
    empty: "Geen taken",
  },
  {
    status: "doing",
    label: "Bezig",
    accent: "border-blue-500",
    dot: "bg-blue-500",
    empty: "Niets in uitvoering",
  },
  {
    status: "done",
    label: "Klaar",
    accent: "border-emerald-500",
    dot: "bg-emerald-500",
    empty: "Nog niets afgerond",
  },
];

export function KanbanPanel({ app, settings }: Props) {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [advancing, setAdvancing] = useState<string | null>(null);

  useEffect(() => {
    const allFiles = app.vault.getMarkdownFiles();
    const projectFiles = filterProjectFiles(allFiles, settings.projectsFolder);
    const caches = projectFiles.map((f) => ({
      file: f,
      frontmatter: app.metadataCache.getFileCache(f)?.frontmatter ?? {},
    }));
    const active = filterActiveProjects(projectFiles, caches);
    setProjects(active);
    if (active.length > 0 && !selectedPath) setSelectedPath(active[0].path);
  }, [app, settings]);

  useEffect(() => {
    if (!selectedPath) return;
    loadTasks(selectedPath);
  }, [selectedPath]);

  const loadTasks = async (path: string) => {
    setLoading(true);
    try {
      const file = app.vault.getFileByPath(path);
      if (!file) return;
      const content = await app.vault.read(file);
      setTasks(parseKanbanTasks(content, file));
    } catch (e) {
      new Notice(`Fout bij laden: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const advance = async (task: KanbanTask) => {
    const key = `${task.file.path}-${task.lineNumber}`;
    setAdvancing(key);
    try {
      const content = await app.vault.read(task.file);
      const updated = updateTaskStatus(content, task.lineNumber, nextStatus(task.status));
      await app.vault.modify(task.file, updated);
      await loadTasks(task.file.path);
    } catch (e) {
      new Notice(`Fout bij bijwerken: ${(e as Error).message}`);
    } finally {
      setAdvancing(null);
    }
  };

  const columnTasks = (status: KanbanStatus) => tasks.filter((t) => t.status === status);
  const selectedProject = projects.find((p) => p.path === selectedPath);

  return (
    <div className="flex flex-col h-full p-3 gap-3 text-sm">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">K</div>
          <span className="font-semibold text-gray-100 text-sm tracking-tight">Kanban</span>
        </div>
        {selectedProject && (
          <span className="text-[10px] text-gray-600 truncate max-w-[120px]">{selectedProject.name}</span>
        )}
      </div>

      {/* Project selector */}
      <div className="relative">
        <select
          className="w-full bg-gray-900 ring-1 ring-white/8 focus:ring-indigo-500/50 text-gray-300 text-xs rounded-lg px-3 py-2 outline-none appearance-none cursor-pointer transition-all"
          value={selectedPath}
          onChange={(e) => setSelectedPath(e.target.value)}
        >
          {projects.length === 0 && <option value="">Geen actieve projecten</option>}
          {projects.map((p) => (
            <option key={p.path} value={p.path}>{p.name}</option>
          ))}
        </select>
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none text-[10px]">▾</div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-xs text-gray-600">Laden…</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && tasks.length === 0 && selectedPath && (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <div className="text-2xl">📋</div>
          <div className="text-xs text-gray-600 text-center">
            Geen taken gevonden.<br />
            Voeg <code className="bg-gray-800 px-1 rounded">- [ ] taak</code> toe aan het project.
          </div>
        </div>
      )}

      {/* Kolommen */}
      {!loading && tasks.length > 0 && (
        <div className="flex gap-2 flex-1 min-h-0 overflow-x-auto pb-1">
          {COLUMNS.map(({ status, label, accent, dot, empty }) => {
            const col = columnTasks(status);
            return (
              <div key={status} className="flex flex-col flex-1 min-w-[120px] gap-2">
                {/* Kolomhoofd */}
                <div className={`flex items-center gap-2 pb-2 border-b-2 ${accent}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
                  <span className="text-xs font-medium text-gray-300">{label}</span>
                  <span className="ml-auto text-[10px] text-gray-600 bg-gray-800 rounded px-1.5 py-0.5 font-mono">{col.length}</span>
                </div>

                {/* Kaarten */}
                <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
                  {col.length === 0 && (
                    <div className="text-[10px] text-gray-700 text-center py-3 border border-dashed border-gray-800 rounded-lg">
                      {empty}
                    </div>
                  )}
                  {col.map((task) => {
                    const key = `${task.file.path}-${task.lineNumber}`;
                    const isMoving = advancing === key;
                    return (
                      <div
                        key={key}
                        onClick={() => !isMoving && advance(task)}
                        title="Klik om door te schuiven"
                        className={`
                          bg-gray-900 ring-1 ring-white/8 rounded-lg px-2.5 py-2.5
                          cursor-pointer hover:ring-indigo-500/40 hover:bg-gray-800
                          transition-all select-none text-xs text-gray-200 leading-snug
                          ${isMoving ? "opacity-40 cursor-wait" : ""}
                        `}
                      >
                        {task.text}
                        <div className="mt-1.5 flex justify-end">
                          <span className="text-[9px] text-gray-700 font-mono">{task.file.basename}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
