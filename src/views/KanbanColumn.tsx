import React, { useEffect, useRef, useState } from "react";
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
  onCardClick: (task: KanbanTask) => void;
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
  onCardClick,
}: Props) {
  const [isOver, setIsOver] = useState(false);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const resetOnDragEnd = () => { setIsOver(false); setInsertIndex(null); };
    document.addEventListener("dragend", resetOnDragEnd);
    return () => document.removeEventListener("dragend", resetOnDragEnd);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsOver(true);

    if (cardsRef.current) {
      const cards = Array.from(cardsRef.current.querySelectorAll<HTMLElement>("[data-card]"));
      let index = tasks.length;
      for (let i = 0; i < cards.length; i++) {
        const rect = cards[i].getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          index = i;
          break;
        }
      }
      setInsertIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsOver(false);
    setInsertIndex(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    setInsertIndex(null);
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
      className={`flex flex-col flex-1 min-w-[140px] min-h-0 gap-2 transition-all ${isOver ? "opacity-90" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Kolomhoofd */}
      <div className={`flex items-center gap-2 pb-2 border-b-2 shrink-0 ${isOver ? "border-indigo-400" : accent}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
        <span className="text-xs font-semibold text-gray-200">{label}</span>
        <span className="ml-auto text-[10px] text-gray-500 bg-gray-800 rounded px-1.5 py-0.5 font-mono">
          {tasks.length}
        </span>
      </div>

      {/* Kaarten — scrollbaar */}
      <div
        ref={cardsRef}
        className={`flex flex-col gap-1.5 overflow-y-auto flex-1 min-h-0 rounded-lg transition-all ${isOver ? "ring-1 ring-indigo-500/30 bg-indigo-950/10" : ""}`}
      >
        {tasks.length === 0 && !isOver && (
          <div className="text-[10px] text-gray-700 text-center py-3 border border-dashed border-gray-800 rounded-lg">
            {emptyText}
          </div>
        )}
        {tasks.map((task, i) => {
          const key = `${task.file.path}-${task.lineNumber}`;
          return (
            <React.Fragment key={key}>
              {isOver && insertIndex === i && (
                <div className="h-0.5 bg-indigo-400 rounded-full mx-1 shrink-0" />
              )}
              <div data-card>
                <KanbanCard
                  task={task}
                  showProject={showProject}
                  projectColor={projectColors?.[projectKey(task)]}
                  isDragging={draggedId === key}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    onDragStart(task);
                  }}
                  onClick={() => onCardClick(task)}
                />
              </div>
            </React.Fragment>
          );
        })}
        {isOver && insertIndex === tasks.length && tasks.length > 0 && (
          <div className="h-0.5 bg-indigo-400 rounded-full mx-1 shrink-0" />
        )}
      </div>

      {/* Toevoegen */}
      <div className="shrink-0 pt-0.5">
        {adding ? (
          <div className="flex flex-col gap-1.5">
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
              className="w-full bg-gray-900 ring-1 ring-indigo-500/60 rounded-lg px-2.5 py-2 text-xs text-gray-200 placeholder-gray-600 outline-none resize-none"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleAdd}
                disabled={saving || !newText.trim()}
                className="flex-1 text-xs py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium rounded-md transition-colors"
              >
                {saving ? "…" : "Toevoegen"}
              </button>
              <button
                onClick={() => { setAdding(false); setNewText(""); }}
                className="text-xs px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-md transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full text-xs text-indigo-400 hover:text-indigo-300 py-2 flex items-center justify-center gap-1.5 rounded-md border border-dashed border-indigo-800/50 hover:border-indigo-600/70 hover:bg-indigo-950/30 transition-all font-medium"
          >
            <span className="text-sm leading-none">+</span> Taak toevoegen
          </button>
        )}
      </div>
    </div>
  );
}
