import React, { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import { App } from "obsidian";
import { GraphData } from "../core/graphBuilder";

const FOLDER_COLORS: Record<string, string> = {
  projects: "#3b82f6",
  ideas: "#eab308",
  inbox: "#6b7280",
  daily: "#8b5cf6",
  research: "#10b981",
  personal: "#f97316",
  archive: "#6b7280",
};

function folderColor(folder: string): string {
  return FOLDER_COLORS[folder] ?? "#9ca3af";
}

interface Props {
  app: App;
  data: GraphData;
}

export function CytoscapeGraph({ app, data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    cyRef.current?.destroy();

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: [
        ...data.nodes.map((n) => ({
          data: { id: n.id, label: n.label, folder: n.folder },
        })),
        ...data.edges.map((e, i) => ({
          data: { id: `e${i}`, source: e.source, target: e.target },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": (ele: cytoscape.NodeSingular) =>
              folderColor(ele.data("folder")),
            label: "data(label)",
            color: "#e5e7eb",
            "font-size": "10px",
            "text-valign": "bottom",
            "text-margin-y": 4,
            width: 24,
            height: 24,
          } as cytoscape.Css.Node,
        },
        {
          selector: "edge",
          style: {
            width: 1,
            "line-color": "#4b5563",
            "target-arrow-color": "#4b5563",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          } as cytoscape.Css.Edge,
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 2,
            "border-color": "#60a5fa",
          } as cytoscape.Css.Node,
        },
      ],
      layout: {
        name: "cose",
        animate: false,
        randomize: false,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 80,
      } as cytoscape.LayoutOptions,
    });

    cyRef.current.on("tap", "node", (evt) => {
      const path = evt.target.id() as string;
      const file = app.vault.getFileByPath(path);
      if (file) app.workspace.openLinkText(file.path, "", false);
    });

    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [data]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "400px", background: "#1f2937" }}
      className="rounded"
    />
  );
}
