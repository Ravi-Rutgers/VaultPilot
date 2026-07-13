import React, { useState } from "react";
import { App } from "obsidian";
import { Cluster } from "../core/graphBuilder";

interface Props {
  app: App;
  clusters: Cluster[];
}

export function ClusterView({ app, clusters }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const basename = (path: string) =>
    path.split("/").pop()?.replace(".md", "") ?? path;

  const open = (path: string) => {
    const file = app.vault.getFileByPath(path);
    if (file) app.workspace.openLinkText(file.path, "", false);
  };

  const sorted = [...clusters].sort((a, b) => b.paths.length - a.paths.length);

  return (
    <div className="p-3 text-sm space-y-2">
      {sorted.map((cluster) => (
        <div key={cluster.name} className="border border-gray-700 rounded">
          <button
            className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-800 rounded"
            onClick={() =>
              setExpanded(expanded === cluster.name ? null : cluster.name)
            }
          >
            <span className="text-xs font-medium text-gray-300 capitalize">
              📁 {cluster.name}
            </span>
            <span className="text-xs text-gray-500">
              {cluster.paths.length} notities
            </span>
          </button>

          {expanded === cluster.name && (
            <div className="px-3 pb-3 space-y-1 border-t border-gray-700">
              {cluster.paths.map((path) => (
                <div
                  key={path}
                  className="text-xs text-blue-400 cursor-pointer hover:text-blue-300 truncate pt-1"
                  onClick={() => open(path)}
                  title={path}
                >
                  {basename(path)}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {clusters.length === 0 && (
        <p className="text-xs text-gray-600 text-center py-4">Geen clusters gevonden.</p>
      )}
    </div>
  );
}
