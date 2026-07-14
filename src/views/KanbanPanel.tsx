import React, { useCallback, useEffect, useRef, useState } from "react";
import { App, Notice } from "obsidian";
import { VaultPilotSettings } from "../settings/settings";
import { ProjectInfo } from "../types";
import { filterProjectFiles, filterActiveProjects } from "../core/scanner";
import {
  KanbanTask,
  KanbanStatus,
  loadTasksFromFolder,
  updateTaskStatus,
  appendTaskToContent,
} from "../core/kanbanParser";
import { KanbanColumn } from "./KanbanColumn";

interface Props {
  app: App;
  settings: VaultPilotSettings;
}

const COLUMNS: { status: KanbanStatus; label: string; accent: string; dot: string; empty: string }[] = [
  { status: "todo",  label: "Te doen", accent: "border-gray-600",    dot: "bg-gray-500",    empty: "Geen taken" },
  { status: "doing", label: "Bezig",   accent: "border-blue-500",    dot: "bg-blue-500",    empty: "Niets in uitvoering" },
  { status: "done",  label: "Klaar",   accent: "border-emerald-500", dot: "bg-emerald-500", empty: "Nog niets afgerond" },
];

const PROJECT_COLORS = [
  "text-violet-400", "text-cyan-400", "text-amber-400",
  "text-rose-400", "text-emerald-400", "text-orange-400", "text-sky-400",
];

const ALL_KEY = "__alle__";

export function KanbanPanel({ app, settings }: Props) {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>(ALL_KEY);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [draggedTask, setDraggedTask] = useState<KanbanTask | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const allFiles = app.vault.getMarkdownFiles();
    const projectFiles = filterProjectFiles(allFiles, settings.projectsFolder);
    const caches = projectFiles.map((f) => ({
      file: f,
      frontmatter: app.metadataCache.getFileCache(f)?.frontmatter ?? {},
    }));
    setProjects(filterActiveProjects(projectFiles, caches));
  }, [app, settings]);

  const loadTasks = useCallback(async (key: string, currentProjects: ProjectInfo[]) => {
    setLoading(true);
    try {
      if (key === ALL_KEY) {
        const all: KanbanTask[] = [];
        for (const p of currentProjects) {
          const folder = p.path.substring(0, p.path.lastIndexOf("/") + 1);
          all.push(...await loadTasksFromFolder(app, folder));
        }
        setTasks(all);
      } else {
        const project = currentProjects.find((p) => p.path === key);
        if (!project) return;
        const folder = project.path.substring(0, project.path.lastIndexOf("/") + 1);
        setTasks(await loadTasksFromFolder(app, folder));
      }
    } catch (e) {
      new Notice(`Fout bij laden: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [app]);

  useEffect(() => {
    if (projects.length > 0) loadTasks(selectedKey, projects);
  }, [selectedKey, projects]);

  const handleDrop = async (targetStatus: KanbanStatus) => {
    if (!draggedTask || draggedTask.status === targetStatus) { setDraggedTask(null); return; }
    try {
      const content = await app.vault.read(draggedTask.file);
      const updated = updateTaskStatus(content, draggedTask.lineNumber, targetStatus);
      await app.vault.modify(draggedTask.file, updated);
      await loadTasks(selectedKey, projects);
    } catch (e) {
      new Notice(`Fout bij verplaatsen: ${(e as Error).message}`);
    }
    setDraggedTask(null);
  };

  const handleAddTask = async (text: string, status: KanbanStatus) => {
    const targetPath = selectedKey === ALL_KEY ? (projects[0]?.path ?? null) : selectedKey;
    if (!targetPath) return;
    const file = app.vault.getFileByPath(targetPath);
    if (!file) return;
    try {
      const content = await app.vault.read(file);
      await app.vault.modify(file, appendTaskToContent(content, text, status));
      await loadTasks(selectedKey, projects);
    } catch (e) {
      new Notice(`Fout bij aanmaken: ${(e as Error).message}`);
    }
  };

  const projectColorMap: Record<string, string> = {};
  projects.forEach((p, i) => { projectColorMap[p.name] = PROJECT_COLORS[i % PROJECT_COLORS.length]; });

  const draggedId = draggedTask ? `${draggedTask.file.path}-${draggedTask.lineNumber}` : null;
  const columnTasks = (status: KanbanStatus) => tasks.filter((t) => t.status === status);
  const selectedLabel = selectedKey === ALL_KEY ? "Alle projecten" : (projects.find((p) => p.path === selectedKey)?.name ?? "");

  return (
    <div className="flex flex-col h-full text-sm">

      {/* Tabs */}
      <div
        ref={tabsRef}
        className="flex gap-1 px-3 pt-3 overflow-x-auto border-b border-gray-800/60"
        style={{ scrollbarWidth: "none" }}
      >
        {[{ key: ALL_KEY, name: "Alle" }, ...projects.map((p) => ({ key: p.path, name: p.name }))].map(({ key, name }) => (
          <button
            key={key}
            onClick={() => setSelectedKey(key)}
            className={`shrink-0 px-3 py-2 text-xs rounded-t-md transition-colors border-b-2 -mb-px ${
              selectedKey === key
                ? "text-gray-100 border-indigo-500 bg-gray-900"
                : "text-gray-600 border-transparent hover:text-gray-400 hover:border-gray-700"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0">

        {/* Sidebar */}
        <div className="w-24 shrink-0 flex flex-col gap-0.5 py-2 px-1.5 border-r border-gray-800/60 overflow-y-auto">
          <button
            onClick={() => setSelectedKey(ALL_KEY)}
            className={`text-left px-2 py-1.5 rounded-md text-[10px] transition-colors ${
              selectedKey === ALL_KEY ? "bg-indigo-600/20 text-indigo-300" : "text-gray-600 hover:text-gray-400 hover:bg-gray-800"
            }`}
          >
            Alle
          </button>
          {projects.map((p) => (
            <button
              key={p.path}
              onClick={() => setSelectedKey(p.path)}
              className={`text-left px-2 py-1.5 rounded-md text-[10px] truncate transition-colors ${
                selectedKey === p.path ? "bg-indigo-600/20 text-indigo-300" : "text-gray-600 hover:text-gray-400 hover:bg-gray-800"
              }`}
              title={p.name}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Bord */}
        <div className="flex flex-col flex-1 min-w-0 p-3 gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">K</div>
              <span className="text-xs font-medium text-gray-300 truncate">{selectedLabel}</span>
            </div>
            {loading && <span className="text-[10px] text-gray-600">Laden…</span>}
          </div>

          {!loading && tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="text-2xl">📋</div>
              <div className="text-xs text-gray-600 text-center">
                Geen taken gevonden.<br />
                Voeg <code className="bg-gray-800 px-1 rounded">- [ ] taak</code> toe aan een project.
              </div>
            </div>
          )}

          {!loading && (
            <div className="flex gap-2 flex-1 min-h-0 overflow-x-auto pb-1">
              {COLUMNS.map(({ status, label, accent, dot, empty }) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  label={label}
                  accent={accent}
                  dot={dot}
                  emptyText={empty}
                  tasks={columnTasks(status)}
                  draggedId={draggedId}
                  showProject={selectedKey === ALL_KEY}
                  projectColors={projectColorMap}
                  onDragStart={setDraggedTask}
                  onDrop={handleDrop}
                  onAddTask={handleAddTask}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
