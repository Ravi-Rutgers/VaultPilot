import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 800;
const DEFAULT_HEIGHT = 380;

interface Props {
  app: App;
  settings: VaultPilotSettings;
}

export function SmartGraphPanel({ app, settings: _settings }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("graph");
  const [tick, setTick] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [graphHeight, setGraphHeight] = useState(DEFAULT_HEIGHT);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartH = useRef(DEFAULT_HEIGHT);

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

  const onDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartH.current = graphHeight;
    e.preventDefault();

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = ev.clientY - dragStartY.current;
      setGraphHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartH.current + delta)));
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [graphHeight]);

  const FOLDER_LEGEND = [
    { folder: "projects", color: "#3b82f6" },
    { folder: "ideas", color: "#eab308" },
    { folder: "daily", color: "#8b5cf6" },
    { folder: "research", color: "#10b981" },
    { folder: "personal", color: "#f97316" },
    { folder: "inbox", color: "#6b7280" },
    { folder: "archive", color: "#4b5563" },
  ];

  return (
    <div className="text-sm h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center border-b border-gray-800 shrink-0 px-1">
        <div className="flex flex-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (collapsed) setCollapsed(false);
              }}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id && !collapsed
                  ? "border-b-2 border-blue-500 text-blue-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Uitklappen" : "Inklappen"}
          className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors rounded"
        >
          {collapsed ? "▲" : "▼"}
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="flex-1 overflow-auto min-h-0">
          {activeTab === "graph" && (
            <div className="flex flex-col">
              {/* Stats + legend */}
              <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {graphData.nodes.length} notities · {graphData.edges.length} links
                </span>
                <span className="text-xs text-gray-600">hover = details · klik = openen</span>
              </div>

              <div className="px-3 pb-2 flex flex-wrap gap-2">
                {FOLDER_LEGEND.map(({ folder, color }) => (
                  <span key={folder} className="flex items-center gap-1 text-xs text-gray-500">
                    <span
                      style={{ background: color, width: 8, height: 8, borderRadius: "50%", display: "inline-block" }}
                    />
                    {folder}
                  </span>
                ))}
              </div>

              <div className="px-3">
                <CytoscapeGraph app={app} data={graphData} height={graphHeight} />
              </div>

              {/* Resize handle */}
              <div
                onMouseDown={onDragStart}
                className="flex items-center justify-center h-4 cursor-row-resize select-none shrink-0 group"
                title="Sleep om formaat te wijzigen"
              >
                <div className="w-8 h-0.5 rounded-full bg-gray-700 group-hover:bg-blue-500 transition-colors" />
              </div>
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
      )}
    </div>
  );
}
