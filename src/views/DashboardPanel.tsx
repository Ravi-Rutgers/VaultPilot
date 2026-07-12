import React, { useEffect, useState } from "react";
import { App, TFile } from "obsidian";
import { VaultPilotSettings } from "../settings/settings";
import { ProjectInfo } from "../types";
import {
  filterProjectFiles,
  filterActiveProjects,
  getRecentFiles,
} from "../core/scanner";
import { parseOpenTasks } from "../core/taskParser";

interface Props {
  app: App;
  settings: VaultPilotSettings;
}

interface DashboardData {
  activeProjects: ProjectInfo[];
  openTaskCount: number;
  inboxCount: number;
  recentFiles: TFile[];
}

export function DashboardPanel({ app, settings }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);

  const load = async () => {
    const allFiles = app.vault.getMarkdownFiles();
    const projectFiles = filterProjectFiles(allFiles, settings.projectsFolder);
    const caches = projectFiles.map((f) => ({
      file: f,
      frontmatter: app.metadataCache.getFileCache(f)?.frontmatter ?? {},
    }));
    const activeProjects = filterActiveProjects(projectFiles, caches);

    const projectAllFiles = allFiles.filter((f) =>
      f.path.startsWith(settings.projectsFolder)
    );
    let totalTasks = 0;
    for (const file of projectAllFiles) {
      const content = await app.vault.read(file);
      totalTasks += parseOpenTasks(content, file).length;
    }

    const inboxCount = allFiles.filter((f) =>
      f.path.startsWith(settings.inboxFolder)
    ).length;
    const recentFiles = getRecentFiles(allFiles, 5);

    setData({ activeProjects, openTaskCount: totalTasks, inboxCount, recentFiles });
  };

  useEffect(() => {
    load();
    const ref = app.vault.on("modify", load);
    return () => app.vault.offref(ref);
  }, []);

  if (!data) {
    return (
      <div id="vaultpilot-root" className="p-4 text-gray-400">
        Laden...
      </div>
    );
  }

  return (
    <div id="vaultpilot-root" className="p-3 text-sm">
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard label="Projecten" value={data.activeProjects.length} color="blue" />
        <StatCard label="Open taken" value={data.openTaskCount} color="red" />
        <StatCard label="Inbox" value={data.inboxCount} color="green" />
      </div>

      <Section title="Actieve Projecten">
        {data.activeProjects.length === 0 ? (
          <p className="text-gray-500 px-3 py-2">Geen actieve projecten gevonden.</p>
        ) : (
          data.activeProjects.map((p) => (
            <FileRow
              key={p.path}
              label={p.name}
              onClick={() => app.workspace.openLinkText(p.name, "", false)}
            />
          ))
        )}
      </Section>

      <Section title="Recent Gewijzigd">
        {data.recentFiles.map((f) => (
          <FileRow
            key={f.path}
            label={f.basename}
            sub={timeSince(f.stat.mtime)}
            onClick={() => app.workspace.openLinkText(f.basename, "", false)}
          />
        ))}
      </Section>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: "blue" | "red" | "green" }) {
  const colors = { blue: "text-blue-400", red: "text-red-400", green: "text-green-400" };
  return (
    <div className="bg-gray-800 rounded p-2 text-center">
      <div className={`text-xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">{title}</div>
      <div className="bg-gray-800 rounded overflow-hidden">{children}</div>
    </div>
  );
}

function FileRow({ label, sub, onClick }: { label: string; sub?: string; onClick: () => void }) {
  return (
    <div
      className="px-3 py-2 border-b border-gray-700 last:border-0 cursor-pointer hover:bg-gray-700 flex justify-between items-center"
      onClick={onClick}
    >
      <span className="truncate">{label}</span>
      {sub && <span className="text-xs text-gray-500 ml-2 shrink-0">{sub}</span>}
    </div>
  );
}

function timeSince(mtime: number): string {
  const diff = Date.now() - mtime;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m geleden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}u geleden`;
  return `${Math.floor(hours / 24)}d geleden`;
}
