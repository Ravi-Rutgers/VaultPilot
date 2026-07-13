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

const COLUMNS: { status: KanbanStatus; label: string; color: string }[] = [
  { status: "todo", label: "📋 Todo", color: "border-gray-600" },
  { status: "doing", label: "⚡ Bezig", color: "border-blue-500" },
  { status: "done", label: "✅ Klaar", color: "border-green-500" },
];

export function KanbanPanel({ app, settings }: Props) {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(false);

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
    try {
      const content = await app.vault.read(task.file);
      const updated = updateTaskStatus(content, task.lineNumber, nextStatus(task.status));
      await app.vault.modify(task.file, updated);
      await loadTasks(task.file.path);
    } catch (e) {
      new Notice(`Fout bij bijwerken: ${(e as Error).message}`);
    }
  };

  const columnTasks = (status: KanbanStatus) => tasks.filter((t) => t.status === status);

  return (
    <div className="p-3 text-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500 uppercase tracking-wider shrink-0">Project</span>
        <select
          className="flex-1 bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-blue-500"
          value={selectedPath}
          onChange={(e) => setSelectedPath(e.target.value)}
        >
          {projects.length === 0 && <option value="">Geen actieve projecten</option>}
          {projects.map((p) => (
            <option key={p.path} value={p.path}>{p.name}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-gray-500 text-center py-4">Laden...</p>}

      {!loading && tasks.length === 0 && selectedPath && (
        <p className="text-gray-500 text-center py-4">
          Geen taken gevonden. Voeg <code>- [ ] taak</code> toe aan het project.
        </p>
      )}

      {!loading && tasks.length > 0 && (
        <div className="flex gap-2">
          {COLUMNS.map(({ status, label, color }) => (
            <div key={status} className="flex-1 min-w-0">
              <div className={`text-xs font-medium mb-2 pb-1 border-b-2 ${color} text-gray-300`}>
                {label} <span className="text-gray-500">({columnTasks(status).length})</span>
              </div>
              <div className="space-y-1">
                {columnTasks(status).map((task) => (
                  <div
                    key={`${task.file.path}-${task.lineNumber}`}
                    className="bg-gray-800 rounded p-2 cursor-pointer hover:bg-gray-700 text-xs text-gray-200 leading-snug"
                    onClick={() => advance(task)}
                    title="Klik om door te schuiven"
                  >
                    {task.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
