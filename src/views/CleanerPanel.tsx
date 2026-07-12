import React, { useState } from "react";
import { App, Notice } from "obsidian";
import { VaultPilotSettings } from "../settings/settings";
import { CleanerIssue } from "../types";
import {
  detectEmptyFiles,
  detectDuplicateTags,
  detectOrphanInboxItems,
} from "../core/linkChecker";

interface Props {
  app: App;
  settings: VaultPilotSettings;
}

export function CleanerPanel({ app, settings }: Props) {
  const [issues, setIssues] = useState<CleanerIssue[] | null>(null);
  const [scanning, setScanning] = useState(false);

  const scan = async () => {
    setScanning(true);
    try {
      const allFiles = app.vault.getMarkdownFiles();
      const cacheEntries = allFiles.map((f) => ({
        file: f,
        cache: app.metadataCache.getFileCache(f),
      }));

      const found: CleanerIssue[] = [
        ...detectEmptyFiles(allFiles),
        ...detectDuplicateTags(cacheEntries),
        ...detectOrphanInboxItems(allFiles, settings.inboxFolder, settings.orphanThresholdDays),
      ];

      const unresolvedLinks = app.metadataCache.unresolvedLinks;
      for (const [sourcePath, links] of Object.entries(unresolvedLinks)) {
        const file = app.vault.getFileByPath(sourcePath);
        if (!file) continue;
        for (const linkText of Object.keys(links)) {
          if ((links as Record<string, number>)[linkText] > 0) {
            found.push({ type: "broken-link", file, details: `[[${linkText}]]` });
          }
        }
      }

      setIssues(found);
    } finally {
      setScanning(false);
    }
  };

  const deleteFile = async (issue: CleanerIssue) => {
    try {
      await app.vault.delete(issue.file);
      setIssues((prev) => prev?.filter((i) => i.file.path !== issue.file.path) ?? null);
      new Notice(`🗑️ ${issue.file.basename} verwijderd`);
    } catch (e) {
      new Notice(`❌ Verwijderen mislukt: ${(e as Error).message}`);
    }
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    empty: { label: "Leeg bestand", color: "text-yellow-400" },
    "broken-link": { label: "Kapotte link", color: "text-red-400" },
    "duplicate-tag": { label: "Dubbele tag", color: "text-orange-400" },
    orphan: { label: "Verweesd (inbox)", color: "text-gray-400" },
  };

  const grouped = issues
    ? (["broken-link", "empty", "duplicate-tag", "orphan"] as const)
        .map((type) => ({
          type,
          items: issues.filter((i) => i.type === type),
        }))
        .filter((g) => g.items.length > 0)
    : [];

  return (
    <div className="p-3 text-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-200">Vault Cleaner</h2>
        <button
          onClick={scan}
          disabled={scanning}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
        >
          {scanning ? "Scannen..." : "🔍 Scan Vault"}
        </button>
      </div>

      {issues === null && (
        <p className="text-gray-500">Klik op "Scan Vault" om je vault te analyseren.</p>
      )}

      {issues !== null && grouped.length === 0 && (
        <div className="text-green-400 text-center py-6">✅ Vault is schoon!</div>
      )}

      {grouped.map(({ type, items }) => {
        const meta = typeLabels[type];
        return (
          <div key={type} className="mb-4">
            <div className={`text-xs uppercase tracking-wider mb-1 ${meta.color}`}>
              {meta.label} ({items.length})
            </div>
            <div className="bg-gray-800 rounded overflow-hidden">
              {items.map((issue) => (
                <div
                  key={`${issue.type}-${issue.file.path}-${issue.details}`}
                  className="px-3 py-2 border-b border-gray-700 last:border-0 flex items-center justify-between hover:bg-gray-700"
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => app.workspace.openLinkText(issue.file.basename, "", false)}
                  >
                    <div className="font-medium truncate">{issue.file.basename}</div>
                    <div className="text-xs text-gray-500">{issue.details}</div>
                  </div>
                  {(type === "empty" || type === "orphan") && (
                    <button
                      className="ml-2 shrink-0 px-2 py-0.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
                      onClick={(e) => { e.stopPropagation(); deleteFile(issue); }}
                      title="Verwijder dit bestand"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
