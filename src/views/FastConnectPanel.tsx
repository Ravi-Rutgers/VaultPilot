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
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const allIds = visible.map((s) => s.id);
    const allChecked = allIds.every((id) => checked.has(id));
    setChecked((prev) => {
      const next = new Set(prev);
      if (allChecked) allIds.forEach((id) => next.delete(id));
      else allIds.forEach((id) => next.add(id));
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
  const allChecked = visible.length > 0 && visible.every((s) => checked.has(s.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-gray-950 ring-1 ring-white/10 rounded-2xl shadow-2xl flex flex-col w-full max-w-md"
        style={{ maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs">⚡</div>
            <span className="font-semibold text-gray-100 text-sm">Fast Connect</span>
          </div>
          <div className="flex items-center gap-2">
            {folders.length > 2 && (
              <select
                className="text-xs bg-gray-900 text-gray-400 ring-1 ring-white/8 rounded-lg px-2 py-1 outline-none"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {folders.map((f) => (
                  <option key={f} value={f}>{f === "alles" ? "Alle mappen" : f}</option>
                ))}
              </select>
            )}
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-md text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors text-base leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Analyse balk */}
        <div className="px-4 py-3 border-b border-gray-800/60">
          {isAnalyzing ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Analyseren…</span>
                <span className="font-mono">{analyzeProgress}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1">
                <div
                  className="bg-indigo-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${analyzeProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={onAnalyzeNow}
                className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium"
              >
                Analyseer nu {hasGroqKey ? "(regel + AI)" : "(regel)"}
              </button>
              {!hasGroqKey && (
                <span className="text-[10px] text-amber-600">Stel een Groq-sleutel in voor AI</span>
              )}
            </div>
          )}
        </div>

        {/* Suggestielijst */}
        <div className="flex-1 overflow-auto px-3 py-2 space-y-0.5">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="text-2xl">🔗</div>
              <p className="text-xs text-gray-600 text-center">
                Geen suggesties gevonden.<br />Klik "Analyseer nu" om te starten.
              </p>
            </div>
          ) : (
            <>
              {/* Selecteer alles */}
              <div
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
                onClick={toggleAll}
              >
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  onClick={(e) => e.stopPropagation()}
                  className="accent-indigo-500"
                />
                <span className="text-[10px] text-gray-600 uppercase tracking-wider">
                  {allChecked ? "Alles deselecteren" : "Alles selecteren"}
                </span>
              </div>

              {autoItems.length > 0 && (
                <>
                  <GroupHeader>Hoge zekerheid (regel)</GroupHeader>
                  {autoItems.map((s) => (
                    <SuggestionRow key={s.id} suggestion={s} checked={checked.has(s.id)} onToggle={() => toggle(s.id)} />
                  ))}
                </>
              )}

              {aiItems.length > 0 && (
                <>
                  <GroupHeader>AI-suggesties</GroupHeader>
                  {aiItems.map((s) => (
                    <SuggestionRow key={s.id} suggestion={s} checked={checked.has(s.id)} onToggle={() => toggle(s.id)} />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3.5 border-t border-gray-800">
          <button
            onClick={onRejectAll}
            className="text-xs text-gray-600 hover:text-rose-400 transition-colors"
          >
            Alles afwijzen
          </button>
          <button
            onClick={handleApply}
            disabled={checked.size === 0 || applying}
            className="text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors font-medium"
          >
            {applying ? "Bezig…" : `${checked.size} toepassen`}
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-widest text-gray-600 px-2 pt-3 pb-1 font-medium">
      {children}
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
  const confidence =
    pct >= 85 ? "text-emerald-400" : pct >= 70 ? "text-amber-400" : "text-gray-600";

  return (
    <div
      className={`flex items-start gap-2.5 px-2 py-2.5 rounded-lg cursor-pointer transition-colors ${checked ? "bg-indigo-950/40" : "hover:bg-gray-800/60"}`}
      onClick={onToggle}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 shrink-0 accent-indigo-500"
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs flex items-center gap-1 truncate">
          <span className="text-gray-400 truncate">{sourceLabel}</span>
          <span className="text-gray-700 shrink-0">→</span>
          <span className="text-indigo-400 font-medium shrink-0">{suggestion.targetBasename}</span>
        </div>
        <div className="text-[10px] text-gray-600 truncate mt-0.5">{suggestion.reason}</div>
      </div>
      <span className={`text-xs shrink-0 font-mono font-semibold ${confidence}`}>
        {pct}%
      </span>
    </div>
  );
}
