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
  archive: "#4b5563",
};

function folderColor(folder: string): string {
  return FOLDER_COLORS[folder] ?? "#9ca3af";
}

interface Props {
  app: App;
  data: GraphData;
  height: number;
}

export function CytoscapeGraph({ app, data, height }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    cyRef.current?.destroy();

    const linkCount: Record<string, number> = {};
    for (const e of data.edges) {
      linkCount[e.source] = (linkCount[e.source] ?? 0) + 1;
      linkCount[e.target] = (linkCount[e.target] ?? 0) + 1;
    }

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: [
        ...data.nodes.map((n) => ({
          data: {
            id: n.id,
            label: n.label,
            folder: n.folder,
            degree: linkCount[n.id] ?? 0,
          },
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
            "background-opacity": 0.85,
            width: (ele: cytoscape.NodeSingular) =>
              Math.max(10, Math.min(28, 10 + (ele.data("degree") as number) * 3)),
            height: (ele: cytoscape.NodeSingular) =>
              Math.max(10, Math.min(28, 10 + (ele.data("degree") as number) * 3)),
            label: "",
            "border-width": 0,
          } as cytoscape.Css.Node,
        },
        {
          selector: "node:selected, node.hovered",
          style: {
            label: "data(label)",
            color: "#f3f4f6",
            "font-size": "9px",
            "text-valign": "bottom",
            "text-margin-y": 5,
            "text-background-color": "#111827",
            "text-background-opacity": 0.85,
            "text-background-padding": "2px",
            "border-width": 2,
            "border-color": "#60a5fa",
            "background-opacity": 1,
          } as cytoscape.Css.Node,
        },
        {
          selector: "edge",
          style: {
            width: 0.8,
            "line-color": "#374151",
            "target-arrow-color": "#374151",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            opacity: 0.6,
          } as cytoscape.Css.Edge,
        },
        {
          selector: "edge.highlighted",
          style: {
            "line-color": "#60a5fa",
            "target-arrow-color": "#60a5fa",
            opacity: 1,
            width: 1.5,
          } as cytoscape.Css.Edge,
        },
      ],
      layout: {
        name: "cose",
        animate: false,
        randomize: true,
        nodeRepulsion: () => 12000,
        idealEdgeLength: () => 100,
        nodeOverlap: 20,
        numIter: 1000,
        gravity: 0.25,
        initialTemp: 200,
      } as cytoscape.LayoutOptions,
      minZoom: 0.1,
      maxZoom: 4,
      wheelSensitivity: 0.2,
    });

    const cy = cyRef.current;

    cy.on("mouseover", "node", (evt) => {
      const node = evt.target as cytoscape.NodeSingular;
      node.addClass("hovered");
      node.connectedEdges().addClass("highlighted");
    });

    cy.on("mouseout", "node", (evt) => {
      const node = evt.target as cytoscape.NodeSingular;
      node.removeClass("hovered");
      node.connectedEdges().removeClass("highlighted");
    });

    cy.on("tap", "node", (evt) => {
      const path = evt.target.id() as string;
      const file = app.vault.getFileByPath(path);
      if (file) app.workspace.openLinkText(file.path, "", false);
    });

    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [data]);

  useEffect(() => {
    cyRef.current?.resize();
  }, [height]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: `${height}px`, background: "#111827" }}
      className="rounded-md"
    />
  );
}
