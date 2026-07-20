import React, { useEffect, useRef } from "react";
import { KanbanTask, extractLabel, extractDueDate } from "../core/kanbanParser";

const LABEL_STYLES: Record<string, string> = {
  kritiek: "bg-red-500/25 text-red-400 ring-1 ring-red-500/50",
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
  const { label, cleanText: afterLabel } = extractLabel(task.text);
  const { dateStr, isOverdue, isDueToday, isDueSoon, cleanText } = extractDueDate(afterLabel);
  const fileLabel = task.file.basename.replace(/^\d{1,2}-\d{1,2}-\d{2,4}$/, "").trim() || task.file.basename;
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    let startX = 0, startY = 0, dragged = false;
    const onPD = (e: PointerEvent) => { startX = e.clientX; startY = e.clientY; dragged = false; };
    const onPU = (e: PointerEvent) => {
      if (dragged) return;
      if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) < 5) onClick();
    };
    const onDS = () => { dragged = true; };
    el.addEventListener("pointerdown", onPD);
    el.addEventListener("pointerup", onPU);
    el.addEventListener("dragstart", onDS);
    return () => {
      el.removeEventListener("pointerdown", onPD);
      el.removeEventListener("pointerup", onPU);
      el.removeEventListener("dragstart", onDS);
    };
  }, [onClick]);

  const dueBadgeClass = isOverdue
    ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30"
    : isDueToday
    ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30"
    : isDueSoon
    ? "bg-yellow-500/10 text-yellow-500"
    : "bg-gray-800 text-gray-500";

  const dueDateLabel = dateStr
    ? isOverdue
      ? `⚠ ${dateStr}`
      : isDueToday
      ? `⏰ Vandaag`
      : dateStr
    : null;

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={onDragStart}
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
      <div className="text-xs text-gray-100 leading-snug">{cleanText}</div>
      <div className="mt-1.5 flex items-center justify-between gap-1 flex-wrap">
        <span className="text-[9px] text-gray-500 font-mono truncate">{fileLabel}</span>
        <div className="flex items-center gap-1 shrink-0">
          {dueDateLabel && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${dueBadgeClass}`}>
              {dueDateLabel}
            </span>
          )}
          {label && (
            <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-medium ${LABEL_STYLES[label]}`}>
              {label === "kritiek" && (
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
              )}
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
