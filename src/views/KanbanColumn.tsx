import React, { useState } from "react";
import { KanbanTask, KanbanStatus } from "../core/kanbanParser";
import { KanbanCard } from "./KanbanCard";

interface Props {
  status: KanbanStatus;
  label: string;
  accent: string;
  dot: string;
  emptyText: string;
  tasks: KanbanTask[];
  draggedId: string | null;
  showProject?: boolean;
  projectColors?: Record<string, string>;
  onDragStart: (task: KanbanTask) => void;
  onDrop: (status: KanbanStatus) => void;
  onAddTask: (text: string, status: KanbanStatus) => Promise<void>;
  onEdit: (task: KanbanTask, newText: string) => Promise<void>;
}

export function KanbanColumn({
  status,
  label,
  accent,
  dot,
  emptyText,
  tasks,
  draggedId,
  showProject,
  projectColors,
  onDragStart,
  onDrop,
  onAddTask,
  onEdit,
}: Props) {
  const [isOver, setIsOver] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    onDrop(status);
  };

  const handleAdd = async () => {
    const text = newText.trim();
    if (!text) return;
    setSaving(true);
    await onAddTask(text, status);
    setNewText("");
    setAdding(false);
    setSaving(false);
  };

  const projectKey = (task: KanbanTask) => task.file.path.split("/")[1] ?? "";

  return (
    <div
      className={`flex flex-col flex-1 min-w-[120px] gap-2 transition-all ${isOver ? "opacity-80" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
    >
      {/* Kolomhoofd */}
      <div className={`flex items-center gap-2 pb-2 border-b-2 ${isOver ? "border-indigo-400" : accent}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
        <span className="text-xs font-medium text-gray-300">{label}</span>
        <span className="ml-auto text-[10px] text-gray-600 bg-gray-800 rounded px-1.5 py-0.5 font-mono">
          {tasks.length}
        </span>
      </div>

      {/* Kaarten */}
      <div className={`flex flex-col gap-1.5 overflow-y-auto flex-1 rounded-lg transition-all ${isOver ? "ring-1 ring-indigo-500/30 bg-indigo-950/10" : ""}`}>
        {tasks.length === 0 && !isOver && (
          <div className="text-[10px] text-gray-700 text-center py-3 border border-dashed border-gray-800 rounded-lg">
            {emptyText}
          </div>
        )}
        {tasks.map((task) => {
          const key = `${task.file.path}-${task.lineNumber}`;
          return (
            <KanbanCard
              key={key}
              task={task}
              showProject={showProject}
              projectColor={projectColors?.[projectKey(task)]}
              isDragging={draggedId === key}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                onDragStart(task);
              }}
              onEdit={(newText) => onEdit(task, newText)}
            />
          );
        })}
      </div>

      {/* Toevoegen */}
      {adding ? (
        <div className="flex flex-col gap-1">
          <textarea
            autoFocus
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); }
              if (e.key === "Escape") { setAdding(false); setNewText(""); }
            }}
            placeholder="Taaknaam… (Enter = opslaan)"
            rows={2}
            className="w-full bg-gray-900 ring-1 ring-indigo-500/50 rounded-lg px-2.5 py-2 text-xs text-gray-200 placeholder-gray-600 outline-none resize-none"
          />
          <div className="flex gap-1">
            <button
              onClick={handleAdd}
              disabled={saving || !newText.trim()}
              className="flex-1 text-[10px] py-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-md transition-colors"
            >
              {saving ? "…" : "Toevoegen"}
            </button>
            <button
              onClick={() => { setAdding(false); setNewText(""); }}
              className="text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-500 rounded-md transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-[10px] text-gray-700 hover:text-gray-400 py-1.5 flex items-center gap-1 transition-colors"
        >
          <span>+</span> Toevoegen
        </button>
      )}
    </div>
  );
}
