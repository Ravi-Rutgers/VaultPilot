import { getSupabase } from "./supabaseClient";

export async function trackEvent(
  vaultId: string,
  eventType: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  if (!vaultId) return;
  try {
    await getSupabase().from("analytics_events").insert({
      vault_id: vaultId,
      event_type: eventType,
      payload,
    });
  } catch { /* stil falen — nooit blokkeren */ }
}

export interface AnalyticsStats {
  eventsThisWeek: number;
  notesModifiedThisWeek: number;
  mostActiveFolder: string | null;
  activeDaysThisWeek: number;
}

export async function fetchAnalyticsStats(vaultId: string): Promise<AnalyticsStats | null> {
  if (!vaultId) return null;
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await getSupabase()
      .from("analytics_events")
      .select("event_type, payload, created_at")
      .eq("vault_id", vaultId)
      .gte("created_at", weekAgo);

    if (!data) return null;

    const modifyEvents = data.filter((e) => e.event_type === "note_modified");
    const notesModifiedThisWeek = new Set(
      modifyEvents.map((e) => (e.payload as Record<string, unknown>)?.path as string)
    ).size;

    const folderCounts: Record<string, number> = {};
    for (const e of modifyEvents) {
      const folder = (e.payload as Record<string, unknown>)?.folder as string | undefined;
      if (folder) folderCounts[folder] = (folderCounts[folder] ?? 0) + 1;
    }
    const mostActiveFolder =
      Object.entries(folderCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const activeDaysThisWeek = new Set(
      data.map((e) => (e.created_at as string).slice(0, 10))
    ).size;

    return {
      eventsThisWeek: data.length,
      notesModifiedThisWeek,
      mostActiveFolder,
      activeDaysThisWeek,
    };
  } catch {
    return null;
  }
}
