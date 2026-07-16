import React from "react";
import { KanbanTask, extractLabel } from "../core/kanbanParser";

const LABEL_STYLES: Record<string, string> = {
  hoog: "bg-rose-500/20 text-rose-400",
  midden: "bg-amber-500/20 text-amber-400",
  laag: "bg-gray-700 text-gray-500",
};

interface Props {
  task: KanbanTask;
  projectColor?: string;
  showProject?: boolean;
  isDragging?: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
}

export function KanbanCard({ task, projectColor, showProject, isDragging, onDragStart, onClick }: Props) {
  const { label, cleanText } = extractLabel(task.text);
  const fileLabel = task.file.basename.replace(/^\d{1,2}-\d{1,2}-\d{2,4}$/, "").trim() || task.file.basename;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`
        bg-gray-900 ring-1 ring-white/10 rounded-lg px-2.5 py-2.5
        cursor-pointer select-none
        hover:ring-indigo-500/40 hover:bg-gray-800 transition-all
        ${isDragging ? "opacity-40 ring-indigo-500/60" : ""}
      `}
    >
      {showProject && projectColor && (
        <div className={`text-[9px] font-semibold uppercase tracking-wider mb-1 ${projectColor}`}>
          {task.file.path.split("/")[1] ?? ""}
        </div>
      )}
      <div className="text-xs text-gray-100 leading-snug">
        {cleanText}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className="text-[9px] text-gray-500 font-mono truncate">{fileLabel}</span>
        {label && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 ${LABEL_STYLES[label]}`}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
