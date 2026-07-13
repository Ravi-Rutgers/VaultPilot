import React, { useMemo, useState } from "react";
import { App } from "obsidian";
import { Suggestion } from "../core/fastConnect";

interface Props {
  app: App;
  suggestions: Suggestion[];
  isAnalyzing: boolean;
  analyzeProgress: number;
  hasGroqKey: boolean;
  onAnalyzeNow: () => void;
  onApply: (ids: string[]) => Promise<void>;
  onRejectAll: () => void;
  onClose: () => void;
}

export function FastConnectPanel({
  app: _app,
  suggestions,
  isAnalyzing,
  analyzeProgress,
  hasGroqKey,
  onAnalyzeNow,
  onApply,
  onRejectAll,
  onClose,
}: Props) {
  const [filter, setFilter] = useState<string>("alles");
  const [checked, setChecked] = useState<Set<string>>(() => {
    const auto = new Set<string>();
    for (const s of suggestions) {
      if (s.status === "pending" && s.method === "rule") auto.add(s.id);
    }
    return auto;
  });
  const [applying, setApplying] = useState(false);

  const folders = useMemo(() => {
    const set = new Set<string>();
    for (const s of suggestions) {
      const top = s.source.split("/")[0];
      if (top) set.add(top);
    }
    return ["alles", ...Array.from(set).sort()];
  }, [suggestions]);

  const visible = useMemo(() => {
    const pending = suggestions.filter((s) => s.status === "pending");
    if (filter === "alles") return pending;
    return pending.filter((s) => s.source.startsWith(filter + "/"));
  }, [suggestions, filter]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = async () => {
    setApplying(true);
    await onApply([...checked]);
    setApplying(false);
  };

  const autoItems = visible.filter((s) => s.method === "rule");
  const aiItems = visible.filter((s) => s.method === "ai");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <div
        className="bg-gray-900 rounded-lg shadow-2xl flex flex-col"
        style={{ width: 480, maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <span className="font-semibold text-white text-sm">⚡ Fast Connect</span>
          <div className="flex items-center gap-2">
            <select
              className="text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded px-2 py-1"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {folders.map((f) => (
                <option key={f} value={f}>{f === "alles" ? "Alle mappen" : f}</option>
              ))}
            </select>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white text-lg leading-none px-1"
            >
              ×
            </button>
          </div>
        </div>

        {/* Analyse-knop + voortgang */}
        <div className="px-4 py-2 border-b border-gray-800 shrink-0">
          {isAnalyzing ? (
            <div>
              <div className="text-xs text-gray-400 mb-1">
                Analyseren... {analyzeProgress}%
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div
                  className="bg-blue-500 h-1 rounded-full transition-all"
                  style={{ width: `${analyzeProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onAnalyzeNow}
                disabled={isAnalyzing}
                className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
                title={!hasGroqKey ? "Geen Groq API-sleutel — alleen regel-gebaseerd" : ""}
              >
                Analyseer nu {hasGroqKey ? "(regel + AI)" : "(regel)"}
              </button>
              {!hasGroqKey && (
                <span className="text-xs text-yellow-500">
                  Stel een Groq-sleutel in voor AI-analyse
                </span>
              )}
            </div>
          )}
        </div>

        {/* Suggestielijst */}
        <div className="flex-1 overflow-auto px-2 py-2 space-y-1">
          {visible.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-6">
              Geen suggesties gevonden. Klik "Analyseer nu" om te starten.
            </p>
          )}

          {autoItems.length > 0 && (
            <>
              <div className="text-xs text-gray-500 uppercase tracking-wider px-2 pt-1 pb-1">
                Regel-gebaseerd (hoge zekerheid)
              </div>
              {autoItems.map((s) => (
                <SuggestionRow
                  key={s.id}
                  suggestion={s}
                  checked={checked.has(s.id)}
                  onToggle={() => toggle(s.id)}
                />
              ))}
            </>
          )}

          {aiItems.length > 0 && (
            <>
              <div className="text-xs text-gray-500 uppercase tracking-wider px-2 pt-2 pb-1">
                AI-suggesties
              </div>
              {aiItems.map((s) => (
                <SuggestionRow
                  key={s.id}
                  suggestion={s}
                  checked={checked.has(s.id)}
                  onToggle={() => toggle(s.id)}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 shrink-0">
          <button
            onClick={onRejectAll}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            Alles afwijzen
          </button>
          <button
            onClick={handleApply}
            disabled={checked.size === 0 || applying}
            className="text-xs px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
          >
            {applying ? "Bezig..." : `Pas ${checked.size} toe`}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuggestionRow({
  suggestion,
  checked,
  onToggle,
}: {
  suggestion: Suggestion;
  checked: boolean;
  onToggle: () => void;
}) {
  const pct = Math.round(suggestion.confidence * 100);
  const sourceLabel = suggestion.source.split("/").pop()?.replace(".md", "") ?? suggestion.source;

  return (
    <div
      className="flex items-start gap-2 px-2 py-2 rounded hover:bg-gray-800 cursor-pointer"
      onClick={onToggle}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 shrink-0 accent-blue-500"
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-200 truncate">
          <span className="text-gray-400">{sourceLabel}</span>
          <span className="text-gray-600 mx-1">→</span>
          <span className="text-blue-400">{suggestion.targetBasename}</span>
        </div>
        <div className="text-xs text-gray-600 truncate mt-0.5">{suggestion.reason}</div>
      </div>
      <span
        className={`text-xs shrink-0 font-mono ${
          pct >= 85 ? "text-green-400" : pct >= 70 ? "text-yellow-400" : "text-gray-500"
        }`}
      >
        {pct}%
      </span>
    </div>
  );
}
