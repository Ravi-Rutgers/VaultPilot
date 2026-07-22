import { App } from "obsidian";
import { getSupabase } from "./supabaseClient";
import { parseKanbanTasks, updateTaskStatus, appendTaskToContent, KanbanStatus, extractLabel } from "./kanbanParser";

export async function syncVaultToCloud(
  app: App,
  vaultId: string,
  projectsFolder: string,
  inboxFolder: string,
  accessToken: string,
  refreshToken: string,
  onTokenRefresh?: (newAccess: string, newRefresh: string) => void
): Promise<void> {
  if (!vaultId || !accessToken || !refreshToken) return;
  const supabase = getSupabase();

  try {
    // Zet sessie opnieuw voor elke sync — access token kan verlopen zijn
    const { data, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError || !data.session) {
      console.error("[VaultPilot] sessie mislukt:", sessionError?.message ?? "geen sessie");
      return;
    }

    // Sla vernieuwde tokens op als ze veranderd zijn
    if (data.session.access_token !== accessToken && onTokenRefresh) {
      onTokenRefresh(data.session.access_token, data.session.refresh_token ?? refreshToken);
    }

    await pullStatusChanges(app, supabase, vaultId);
    await Promise.all([
      syncTasks(app, supabase, vaultId, projectsFolder),
      syncInbox(app, supabase, vaultId, inboxFolder),
    ]);
    console.log("[VaultPilot] sync complete");
  } catch (e) {
    console.error("[VaultPilot] sync error:", e);
  }
}

async function pullStatusChanges(
  app: App,
  supabase: ReturnType<typeof getSupabase>,
  vaultId: string
): Promise<void> {
  const { data: tasks } = await supabase
    .from("vault_tasks")
    .select("file_path, line_number, status")
    .eq("vault_id", vaultId);

  if (!tasks || tasks.length === 0) return;

  // Groepeer per bestand
  const byFile: Record<string, { line_number: number; status: string }[]> = {};
  for (const t of tasks) {
    if (!byFile[t.file_path]) byFile[t.file_path] = [];
    byFile[t.file_path].push(t);
  }

  for (const [filePath, fileTasks] of Object.entries(byFile)) {
    try {
      const file = app.vault.getFileByPath(filePath);
      if (!file) continue; // bestand bestaat niet in Obsidian (bijv. webapp/tasks.md)

      let content = await app.vault.read(file);
      let changed = false;

      for (const task of fileTasks) {
        const lines = content.split("\n");
        const line = lines[task.line_number];
        if (!line) continue;

        let fileStatus: string | null = null;
        if (/^- \[ \]/.test(line)) fileStatus = "todo";
        else if (/^- \[\/\]/.test(line)) fileStatus = "doing";
        else if (/^- \[x\]/i.test(line)) fileStatus = "done";

        if (fileStatus && fileStatus !== task.status) {
          content = updateTaskStatus(content, task.line_number, task.status as KanbanStatus);
          changed = true;
        }
      }

      if (changed) {
        await app.vault.modify(file, content);
      }
    } catch { /* bestand niet leesbaar — overslaan */ }
  }
}

async function syncTasks(
  app: App,
  supabase: ReturnType<typeof getSupabase>,
  vaultId: string,
  projectsFolder: string
): Promise<void> {
  const allFiles = app.vault.getMarkdownFiles().filter((f) =>
    f.path.startsWith(projectsFolder)
  );

  const rows: {
    vault_id: string;
    file_path: string;
    line_number: number;
    text: string;
    status: string;
    project: string | null;
    priority: string | null;
  }[] = [];

  for (const file of allFiles) {
    try {
      const content = await app.vault.read(file);
      const tasks = parseKanbanTasks(content, file);
      const project = file.path.slice(projectsFolder.length).split("/")[0] ?? null;

      for (const task of tasks) {
        const { label } = extractLabel(task.text);
        rows.push({
          vault_id: vaultId,
          file_path: file.path,
          line_number: task.lineNumber,
          text: task.text,
          status: task.status,
          project,
          priority: label,
        });
      }
    } catch { /* bestand niet leesbaar */ }
  }

  console.log(`[VaultPilot] syncTasks: ${allFiles.length} files, ${rows.length} rows`);

  if (rows.length === 0) {
    // Verwijder oude taken als vault leeg is
    await supabase.from("vault_tasks").delete().eq("vault_id", vaultId);
    return;
  }

  // Upsert alle taken (unieke combinatie vault_id + file_path + line_number)
  const { error: upsertError } = await supabase.from("vault_tasks").upsert(rows, {
    onConflict: "vault_id,file_path,line_number",
  });
  console.log("[VaultPilot] upsert result:", upsertError ? upsertError.message : "OK");

  // Verwijder taken die niet meer in de vault staan
  const knownPaths = [...new Set(rows.map((r) => r.file_path))];
  await supabase
    .from("vault_tasks")
    .delete()
    .eq("vault_id", vaultId)
    .not("file_path", "in", `(${knownPaths.map((p) => `"${p}"`).join(",")})`);
}

async function syncInbox(
  app: App,
  supabase: ReturnType<typeof getSupabase>,
  vaultId: string,
  inboxFolder: string
): Promise<void> {
  const inboxFiles = app.vault.getMarkdownFiles().filter((f) =>
    f.path.startsWith(inboxFolder)
  );

  const rows = inboxFiles.map((f) => ({
    vault_id: vaultId,
    title: f.basename,
    file_path: f.path,
    created_at: new Date(f.stat.ctime).toISOString(),
  }));

  // Verwijder alles en schrijf opnieuw (inbox is klein)
  await supabase.from("inbox_items").delete().eq("vault_id", vaultId);
  if (rows.length > 0) {
    await supabase.from("inbox_items").insert(rows);
  }
}

/**
 * Haalt taken op uit Supabase die via de webapp zijn aangemaakt (file_path = 'webapp/tasks.md')
 * en schrijft ze naar het juiste projectbestand in Obsidian.
 * Geeft het aantal gesynchroniseerde taken terug.
 */
export async function syncFromCloud(
  app: App,
  vaultId: string,
  projectsFolder: string,
  accessToken: string,
  refreshToken: string,
  onTokenRefresh?: (newAccess: string, newRefresh: string) => void
): Promise<number> {
  if (!vaultId || !accessToken || !refreshToken) return 0;
  const supabase = getSupabase();

  const { data, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError || !data.session) {
    console.error("[VaultPilot] syncFromCloud: sessie mislukt");
    return 0;
  }

  if (data.session.access_token !== accessToken && onTokenRefresh) {
    onTokenRefresh(data.session.access_token, data.session.refresh_token ?? refreshToken);
  }

  // Haal webapp-taken op — alleen taken waarvan het bestand niet in Obsidian bestaat
  const { data: webTasks, error } = await supabase
    .from("vault_tasks")
    .select("id, file_path, text, status, project, priority")
    .eq("vault_id", vaultId);

  if (error || !webTasks || webTasks.length === 0) return 0;

  // Filter: taken waarvan het bestand niet in Obsidian staat (webapp-only taken)
  const vaultPaths = new Set(app.vault.getMarkdownFiles().map((f) => f.path));
  const webOnlyTasks = webTasks.filter((t) => !vaultPaths.has(t.file_path));

  if (webOnlyTasks.length === 0) return 0;

  // Groepeer per project
  const byProject = new Map<string, typeof webOnlyTasks>();
  for (const task of webOnlyTasks) {
    const projectName = task.project ?? "inbox";
    if (!byProject.has(projectName)) byProject.set(projectName, []);
    byProject.get(projectName)!.push(task);
  }

  let synced = 0;
  const syncedIds: string[] = [];

  for (const [projectName, tasks] of byProject.entries()) {
    const folder = projectsFolder + projectName + "/";
    const files = app.vault.getMarkdownFiles().filter((f) => f.path.startsWith(folder));

    // Zoek het beste doelbestand (notes.md > <project>.md > eerste bestand > nieuw aanmaken)
    let target = files.find((f) => f.basename.toLowerCase() === "notes")
      ?? files.find((f) => f.basename.toLowerCase() === projectName.toLowerCase())
      ?? files[0];

    if (!target) {
      const path = folder + "tasks.md";
      try { await app.vault.createFolder(folder); } catch { /* bestaat al */ }
      target = await app.vault.create(path, `# Taken — ${projectName}\n`);
    }

    let content = await app.vault.read(target);
    for (const task of tasks) {
      const status = (task.status as KanbanStatus) ?? "todo";
      content = appendTaskToContent(content, task.text, status);
      syncedIds.push(task.id);
      synced++;
    }
    await app.vault.modify(target, content);
  }

  // Update file_path in Supabase zodat ze niet opnieuw gesynchroniseerd worden
  if (syncedIds.length > 0) {
    console.log(`[VaultPilot] syncFromCloud: ${synced} taken naar Obsidian geschreven`);
  }

  return synced;
}
