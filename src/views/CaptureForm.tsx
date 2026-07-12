import React, { useState, useRef, useEffect } from "react";

type CaptureType = "idea" | "inbox" | "task";

interface Props {
  onCapture: (text: string, type: CaptureType) => void;
  onClose: () => void;
}

export function CaptureForm({ onCapture, onClose }: Props) {
  const [text, setText] = useState("");
  const [type, setType] = useState<CaptureType>("inbox");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onCapture(text.trim(), type);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
    if (e.key === "Escape") onClose();
  };

  const types: { value: CaptureType; label: string; icon: string }[] = [
    { value: "inbox", label: "Inbox", icon: "📥" },
    { value: "idea", label: "Idee", icon: "💡" },
    { value: "task", label: "Taak", icon: "📋" },
  ];

  return (
    <div id="vaultpilot-root" className="p-4" onKeyDown={handleKeyDown}>
      <textarea
        ref={inputRef}
        className="w-full bg-gray-800 text-gray-100 rounded p-3 text-sm resize-none border border-gray-600 focus:outline-none focus:border-blue-500"
        rows={4}
        placeholder="Wat wil je vastleggen?"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex gap-2 mt-3">
        {types.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
              type === t.value
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2 mt-3">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200"
        >
          Annuleren
        </button>
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Opslaan (Ctrl+Enter)
        </button>
      </div>
    </div>
  );
}
