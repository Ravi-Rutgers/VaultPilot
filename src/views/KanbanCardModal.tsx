import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { App } from "obsidian";
import { KanbanTask, extractLabel } from "../core/kanbanParser";

const LABEL_STYLES: Record<string, string> = {
  hoog: "bg-rose-500/20 text-rose-400",
  midden: "bg-amber-500/20 text-amber-400",
  laag: "bg-gray-700 text-gray-500",
};

interface Props {
  task: KanbanTask;
  app: App;
  onClose: () => void;
  onEdit: (newText: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function KanbanCardModal({ task, app, onClose, onEdit, onDelete }: Props) {
  const { label, cleanText } = extractLabel(task.text);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editingRef = useRef(false);
  useEffect(() => { editingRef.current = editing; }, [editing]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingRef.current) setEditing(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    if (editing) setTimeout(() => textareaRef.current?.select(), 0);
  }, [editing]);

  const handleSave = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === task.text) { setEditing(false); return; }
    setSaving(true);
    await onEdit(trimmed);
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
    onClose();
  };

  const handleOpenInObsidian = () => {
    app.workspace.getLeaf().openFile(task.file);
    onClose();
  };

  const projectName = task.file.path.split("/")[1] ?? "";
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-80 max-w-[90vw] p-5 flex flex-col gap-4"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            {projectName && (
              <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-semibold">
                {projectName}
              </span>
            )}
            <h2 className="text-sm font-semibold text-gray-100 leading-snug break-words">
              {cleanText}
            </h2>
          </div>
          <button
            onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
            className="shrink-0 text-gray-500 hover:text-gray-300 text-lg leading-none mt-0.5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Bestandspad */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono bg-gray-800/60 rounded-md px-2.5 py-1.5">
          <span>📄</span>
          <span className="truncate">{task.file.path}</span>
        </div>

        {/* Label */}
        {label && (
          <span className={`self-start text-[9px] px-2 py-0.5 rounded font-medium ${LABEL_STYLES[label]}`}>
            {label}
          </span>
        )}

        {/* Bewerken */}
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              value={editText}
              rows={3}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
                if (e.key === "Escape") { e.stopPropagation(); setEditing(false); }
              }}
              className="w-full bg-gray-800 ring-1 ring-indigo-500/60 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none resize-none"
            />
            <div className="flex gap-2">
              <button
                onPointerDown={(e) => { e.stopPropagation(); handleSave(); }}
                disabled={saving}
                className="flex-1 text-xs py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {saving ? "…" : "Opslaan"}
              </button>
              <button
                onPointerDown={(e) => { e.stopPropagation(); setEditing(false); }}
                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onPointerDown={(e) => { e.stopPropagation(); setEditing(true); }}
              className="flex-1 text-xs py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <span>✎</span> Bewerken
            </button>
            <button
              onPointerDown={(e) => { e.stopPropagation(); handleOpenInObsidian(); }}
              className="flex-1 text-xs py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <span>↗</span> Open
            </button>
            <button
              onPointerDown={(e) => { e.stopPropagation(); handleDelete(); }}
              disabled={deleting}
              className="text-xs px-3 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? "…" : "🗑"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
