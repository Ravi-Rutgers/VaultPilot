import React, { useRef, useState } from "react";
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
  onEdit?: (newText: string) => Promise<void>;
}

export function KanbanCard({ task, projectColor, showProject, isDragging, onDragStart, onEdit }: Props) {
  const { label, cleanText } = extractLabel(task.text);
  const fileLabel = task.file.basename.replace(/^\d{1,2}-\d{1,2}-\d{2,4}$/, "").trim() || task.file.basename;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onEdit) return;
    setEditText(task.text);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const saveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === task.text) { setEditing(false); return; }
    setSaving(true);
    await onEdit?.(trimmed);
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-gray-900 ring-1 ring-indigo-500/60 rounded-lg px-2.5 py-2.5 flex flex-col gap-1.5">
        <textarea
          ref={inputRef}
          autoFocus
          value={editText}
          rows={2}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
            if (e.key === "Escape") { setEditing(false); }
          }}
          className="w-full bg-transparent text-xs text-gray-200 outline-none resize-none leading-snug"
        />
        <div className="flex gap-1">
          <button
            onClick={saveEdit}
            disabled={saving}
            className="flex-1 text-[10px] py-0.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded transition-colors"
          >
            {saving ? "…" : "Opslaan"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-[10px] px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`
        bg-gray-900 ring-1 ring-white/10 rounded-lg px-2.5 py-2.5
        cursor-grab active:cursor-grabbing select-none
        hover:ring-indigo-500/40 hover:bg-gray-800 transition-all
        ${isDragging ? "opacity-40 ring-indigo-500/60" : ""}
      `}
    >
      {showProject && projectColor && (
        <div className={`text-[9px] font-semibold uppercase tracking-wider mb-1 ${projectColor}`}>
          {task.file.path.split("/")[1] ?? ""}
        </div>
      )}
      <div
        className="text-xs text-gray-100 leading-snug"
        onDoubleClick={onEdit ? startEdit : undefined}
        title={onEdit ? "Dubbelklik om te bewerken" : undefined}
      >
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
