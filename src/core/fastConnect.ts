export type SuggestionStatus = "pending" | "accepted" | "rejected";
export type SuggestionMethod = "rule" | "ai";

export interface Suggestion {
  id: string;
  source: string;
  target: string;
  targetBasename: string;
  confidence: number;
  method: SuggestionMethod;
  reason: string;
  status: SuggestionStatus;
  foundAt: number;
}

type FileRef = { path: string; basename: string };

export function buildSuggestionId(source: string, target: string): string {
  return `${source}→${target}`;
}

export function isDuplicateLink(
  source: string,
  target: string,
  resolvedLinks: Record<string, Record<string, number>>
): boolean {
  return !!(resolvedLinks[source] && target in resolvedLinks[source]);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findRuleBasedSuggestions(
  files: FileRef[],
  fileContents: Record<string, string>,
  resolvedLinks: Record<string, Record<string, number>>
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const now = Date.now();

  for (const sourceFile of files) {
    const content = fileContents[sourceFile.path];
    if (!content) continue;

    for (const targetFile of files) {
      if (targetFile.path === sourceFile.path) continue;
      if (isDuplicateLink(sourceFile.path, targetFile.path, resolvedLinks)) continue;

      const name = targetFile.basename;
      const wikilinkPattern = new RegExp(`\\[\\[${escapeRegex(name)}(\\|[^\\]]+)?\\]\\]`);
      const mentionPattern = new RegExp(`(?<!\\[\\[)\\b${escapeRegex(name)}\\b(?!\\]\\])`, "i");

      if (!wikilinkPattern.test(content) && mentionPattern.test(content)) {
        suggestions.push({
          id: buildSuggestionId(sourceFile.path, targetFile.path),
          source: sourceFile.path,
          target: targetFile.path,
          targetBasename: targetFile.basename,
          confidence: 0.9,
          method: "rule",
          reason: `"${name}" wordt vermeld in deze notitie zonder wikilink`,
          status: "pending",
          foundAt: now,
        });
      }
    }
  }

  return suggestions;
}

export async function fetchGroqSuggestions(
  files: FileRef[],
  fileContents: Record<string, string>,
  resolvedLinks: Record<string, Record<string, number>>,
  apiKey: string,
  onProgress?: (done: number, total: number) => void
): Promise<Suggestion[]> {
  const BATCH_SIZE = 20;
  const suggestions: Suggestion[] = [];
  const now = Date.now();

  const existingLinks = Object.entries(resolvedLinks).flatMap(([src, targets]) =>
    Object.keys(targets).map((tgt) => ({ source: src, target: tgt }))
  );

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const notities = batch.map((f) => ({
      path: f.path,
      title: f.basename,
      preview: (fileContents[f.path] ?? "").slice(0, 200),
    }));

    const prompt = `Je bent een kennisbeheerder. Analyseer deze notities en vind semantische verbanden die nog niet als wikilink bestaan. Stuur alleen JSON terug, geen uitleg.

Notities:
${JSON.stringify(notities, null, 2)}

Bestaande links (sla deze over):
${JSON.stringify(existingLinks, null, 2)}

Antwoord als JSON array (alleen verbanden met confidence >= 0.6):
[{"source":"pad","target":"pad","confidence":0.87,"reason":"kort"}]`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 1000,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) throw new Error(`Groq HTTP ${response.status}`);

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content ?? "[]";
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      const items = JSON.parse(jsonMatch[0]) as Array<{
        source: string;
        target: string;
        confidence: number;
        reason: string;
      }>;

      for (const item of items) {
        if (isDuplicateLink(item.source, item.target, resolvedLinks)) continue;
        if (item.source === item.target) continue;
        const targetFile = files.find((f) => f.path === item.target);
        if (!targetFile) continue;
        if (!files.find((f) => f.path === item.source)) continue;

        suggestions.push({
          id: buildSuggestionId(item.source, item.target),
          source: item.source,
          target: item.target,
          targetBasename: targetFile.basename,
          confidence: item.confidence,
          method: "ai",
          reason: item.reason,
          status: "pending",
          foundAt: now,
        });
      }
    } catch {
      // batch overslaan bij timeout of parse-fout
    }

    onProgress?.(Math.min(i + BATCH_SIZE, files.length), files.length);

    if (i + BATCH_SIZE < files.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return suggestions;
}

export function wikilinkLine(targetBasename: string): string {
  return `\n[[${targetBasename}]]`;
}

export function deduplicateSuggestions(
  existing: Suggestion[],
  incoming: Suggestion[]
): Suggestion[] {
  const ids = new Set(existing.map((s) => s.id));
  return [...existing, ...incoming.filter((s) => !ids.has(s.id))];
}
