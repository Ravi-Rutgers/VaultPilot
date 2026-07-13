import { describe, it, expect } from "vitest";
import { buildGraph, buildClusters, getConnections } from "../src/core/graphBuilder";

const files = [
  { path: "projects/VaultPilot/VaultPilot.md", basename: "VaultPilot" },
  { path: "projects/NOVA/NOVA.md", basename: "NOVA" },
  { path: "ideas/GraphIdea.md", basename: "GraphIdea" },
  { path: "inbox/TODO.md", basename: "TODO" },
];

const resolvedLinks: Record<string, Record<string, number>> = {
  "projects/VaultPilot/VaultPilot.md": {
    "projects/NOVA/NOVA.md": 1,
    "ideas/GraphIdea.md": 2,
  },
  "projects/NOVA/NOVA.md": {
    "inbox/TODO.md": 1,
  },
  "ideas/GraphIdea.md": {},
  "inbox/TODO.md": {},
};

describe("buildGraph", () => {
  it("maakt een node per bestand", () => {
    const { nodes } = buildGraph(files, resolvedLinks);
    expect(nodes).toHaveLength(4);
  });

  it("node heeft id, label en folder", () => {
    const { nodes } = buildGraph(files, resolvedLinks);
    const vp = nodes.find((n) => n.id === "projects/VaultPilot/VaultPilot.md");
    expect(vp).toMatchObject({
      id: "projects/VaultPilot/VaultPilot.md",
      label: "VaultPilot",
      folder: "projects",
    });
  });

  it("maakt edges voor bestaande links", () => {
    const { edges } = buildGraph(files, resolvedLinks);
    expect(edges).toHaveLength(3);
    expect(edges).toContainEqual({
      source: "projects/VaultPilot/VaultPilot.md",
      target: "projects/NOVA/NOVA.md",
    });
  });

  it("slaat edges over naar bestanden buiten de vault", () => {
    const linksWithExternal: Record<string, Record<string, number>> = {
      "projects/VaultPilot/VaultPilot.md": {
        "bestaat/niet.md": 1,
      },
    };
    const { edges } = buildGraph(files, linksWithExternal);
    expect(edges).toHaveLength(0);
  });
});

describe("buildClusters", () => {
  it("groepeert bestanden per top-level map", () => {
    const clusters = buildClusters(files);
    expect(clusters).toHaveLength(3);
  });

  it("cluster naam is de top-level mapnaam", () => {
    const clusters = buildClusters(files);
    const names = clusters.map((c) => c.name).sort();
    expect(names).toEqual(["ideas", "inbox", "projects"]);
  });

  it("cluster bevat juiste paden", () => {
    const clusters = buildClusters(files);
    const projectCluster = clusters.find((c) => c.name === "projects")!;
    expect(projectCluster.paths).toHaveLength(2);
    expect(projectCluster.paths).toContain("projects/VaultPilot/VaultPilot.md");
  });

  it("rootbestanden vallen in 'root' cluster", () => {
    const withRoot = [...files, { path: "README.md", basename: "README" }];
    const clusters = buildClusters(withRoot);
    const root = clusters.find((c) => c.name === "root");
    expect(root).toBeDefined();
    expect(root!.paths).toContain("README.md");
  });
});

describe("getConnections", () => {
  it("geeft uitgaande links", () => {
    const conn = getConnections("projects/VaultPilot/VaultPilot.md", resolvedLinks);
    expect(conn.outbound).toHaveLength(2);
    expect(conn.outbound).toContain("projects/NOVA/NOVA.md");
  });

  it("geeft inkomende links", () => {
    const conn = getConnections("projects/NOVA/NOVA.md", resolvedLinks);
    expect(conn.inbound).toHaveLength(1);
    expect(conn.inbound).toContain("projects/VaultPilot/VaultPilot.md");
  });

  it("geeft lege outbound voor geïsoleerde notitie", () => {
    const conn = getConnections("inbox/TODO.md", resolvedLinks);
    expect(conn.inbound).toHaveLength(1);
    expect(conn.outbound).toHaveLength(0);
  });
});
