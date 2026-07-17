import { App } from "obsidian";
import { getSupabase } from "./supabaseClient";
import { parseKanbanTasks } from "./kanbanParser";

export async function syncVaultToCloud(
  app: App,
  vaultId: string,
  projectsFolder: string,
  inboxFolder: string
): Promise<void> {
  if (!vaultId) return;
  const supabase = getSupabase();

  try {
    await Promise.all([
      syncTasks(app, supabase, vaultId, projectsFolder),
      syncInbox(app, supabase, vaultId, inboxFolder),
    ]);
  } catch { /* stil falen — nooit de plugin blokkeren */ }
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
  }[] = [];

  for (const file of allFiles) {
    try {
      const content = await app.vault.read(file);
      const tasks = parseKanbanTasks(content, file);
      const project = file.path.slice(projectsFolder.length).split("/")[0] ?? null;

      for (const task of tasks) {
        rows.push({
          vault_id: vaultId,
          file_path: file.path,
          line_number: task.lineNumber,
          text: task.text,
          status: task.status,
          project,
        });
      }
    } catch { /* bestand niet leesbaar */ }
  }

  if (rows.length === 0) {
    // Verwijder oude taken als vault leeg is
    await supabase.from("vault_tasks").delete().eq("vault_id", vaultId);
    return;
  }

  // Upsert alle taken (unieke combinatie vault_id + file_path + line_number)
  await supabase.from("vault_tasks").upsert(rows, {
    onConflict: "vault_id,file_path,line_number",
  });

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
