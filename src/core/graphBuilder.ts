export interface GraphNode {
  id: string;
  label: string;
  folder: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Cluster {
  name: string;
  paths: string[];
}

export interface ConnectionInfo {
  inbound: string[];
  outbound: string[];
}

type FileRef = { path: string; basename: string };

function topFolder(path: string): string {
  const parts = path.split("/");
  return parts.length > 1 ? parts[0] : "root";
}

export function buildGraph(
  files: FileRef[],
  resolvedLinks: Record<string, Record<string, number>>
): GraphData {
  const pathSet = new Set(files.map((f) => f.path));

  const nodes: GraphNode[] = files.map((f) => ({
    id: f.path,
    label: f.basename,
    folder: topFolder(f.path),
  }));

  const edges: GraphEdge[] = [];
  for (const [source, targets] of Object.entries(resolvedLinks)) {
    for (const target of Object.keys(targets)) {
      if (pathSet.has(target)) {
        edges.push({ source, target });
      }
    }
  }

  return { nodes, edges };
}

export function buildClusters(files: FileRef[]): Cluster[] {
  const map = new Map<string, string[]>();
  for (const f of files) {
    const folder = topFolder(f.path);
    if (!map.has(folder)) map.set(folder, []);
    map.get(folder)!.push(f.path);
  }
  return Array.from(map.entries()).map(([name, paths]) => ({ name, paths }));
}

export function getConnections(
  path: string,
  resolvedLinks: Record<string, Record<string, number>>
): ConnectionInfo {
  const outbound = Object.keys(resolvedLinks[path] ?? {});
  const inbound = Object.entries(resolvedLinks)
    .filter(([, targets]) => path in targets)
    .map(([source]) => source);
  return { inbound, outbound };
}
