import React, { useEffect, useMemo, useState } from "react";
import { App } from "obsidian";
import { VaultPilotSettings } from "../settings/settings";
import { buildGraph, buildClusters } from "../core/graphBuilder";
import { CytoscapeGraph } from "./CytoscapeGraph";
import { ConnectionsList } from "./ConnectionsList";
import { ClusterView } from "./ClusterView";

type Tab = "graph" | "verbanden" | "clusters";

const TABS: { id: Tab; label: string }[] = [
  { id: "graph", label: "🕸 Graph" },
  { id: "verbanden", label: "🔗 Verbanden" },
  { id: "clusters", label: "📁 Clusters" },
];

interface Props {
  app: App;
  settings: VaultPilotSettings;
}

export function SmartGraphPanel({ app, settings: _settings }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("graph");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ref = app.metadataCache.on("resolved", () => setTick((n) => n + 1));
    return () => app.metadataCache.offref(ref);
  }, [app]);

  const files = useMemo(
    () => app.vault.getMarkdownFiles().map((f) => ({ path: f.path, basename: f.basename })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app, tick]
  );

  const resolvedLinks = app.metadataCache.resolvedLinks;
  const graphData = useMemo(() => buildGraph(files, resolvedLinks), [files, resolvedLinks]);
  const clusters = useMemo(() => buildClusters(files), [files]);

  return (
    <div className="text-sm h-full flex flex-col">
      <div className="flex border-b border-gray-700 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === "graph" && (
          <div className="p-3">
            <p className="text-xs text-gray-500 mb-2">
              {graphData.nodes.length} notities · {graphData.edges.length} links — klik op een node om te openen
            </p>
            <CytoscapeGraph app={app} data={graphData} />
          </div>
        )}

        {activeTab === "verbanden" && (
          <ConnectionsList
            app={app}
            files={files}
            resolvedLinks={resolvedLinks}
          />
        )}

        {activeTab === "clusters" && (
          <ClusterView app={app} clusters={clusters} />
        )}
      </div>
    </div>
  );
}
