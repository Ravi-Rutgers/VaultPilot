import React, { useEffect, useState } from "react";
import { App } from "obsidian";
import { ConnectionInfo, getConnections } from "../core/graphBuilder";

interface FileRef {
  path: string;
  basename: string;
}

interface Props {
  app: App;
  files: FileRef[];
  resolvedLinks: Record<string, Record<string, number>>;
}

export function ConnectionsList({ app, files, resolvedLinks }: Props) {
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [info, setInfo] = useState<ConnectionInfo>({ inbound: [], outbound: [] });

  useEffect(() => {
    const active = app.workspace.getActiveFile();
    if (active) setSelectedPath(active.path);
    else if (files.length > 0) setSelectedPath(files[0].path);
  }, [files]);

  useEffect(() => {
    if (!selectedPath) return;
    setInfo(getConnections(selectedPath, resolvedLinks));
  }, [selectedPath, resolvedLinks]);

  const open = (path: string) => {
    const file = app.vault.getFileByPath(path);
    if (file) app.workspace.openLinkText(file.path, "", false);
  };

  const basename = (path: string) =>
    path.split("/").pop()?.replace(".md", "") ?? path;

  return (
    <div className="p-3 text-sm space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 uppercase tracking-wider shrink-0">Notitie</span>
        <select
          className="flex-1 bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-blue-500"
          value={selectedPath}
          onChange={(e) => setSelectedPath(e.target.value)}
        >
          {files.map((f) => (
            <option key={f.path} value={f.path}>{f.basename}</option>
          ))}
        </select>
      </div>

      <LinkSection
        title={`Gelinkt door (${info.inbound.length})`}
        paths={info.inbound}
        onOpen={open}
        basename={basename}
        empty="Geen notities linken hierheen."
      />
      <LinkSection
        title={`Linkt naar (${info.outbound.length})`}
        paths={info.outbound}
        onOpen={open}
        basename={basename}
        empty="Geen uitgaande links."
      />
    </div>
  );
}

function LinkSection({
  title,
  paths,
  onOpen,
  basename,
  empty,
}: {
  title: string;
  paths: string[];
  onOpen: (p: string) => void;
  basename: (p: string) => string;
  empty: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-400 mb-2 border-b border-gray-700 pb-1">
        {title}
      </div>
      {paths.length === 0 ? (
        <p className="text-xs text-gray-600">{empty}</p>
      ) : (
        <div className="space-y-1">
          {paths.map((p) => (
            <div
              key={p}
              className="text-xs text-blue-400 cursor-pointer hover:text-blue-300 truncate"
              onClick={() => onOpen(p)}
              title={p}
            >
              {basename(p)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
