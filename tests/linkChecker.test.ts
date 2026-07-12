import { describe, it, expect } from "vitest";
import {
  detectEmptyFiles,
  detectDuplicateTags,
  detectOrphanInboxItems,
  buildFileBasenameSet,
} from "../src/core/linkChecker";

const makeFile = (path: string, size = 100, ctime = Date.now()) =>
  ({ path, basename: path.split("/").pop()!.replace(".md", ""), stat: { size, ctime }, name: path.split("/").pop() } as any);

describe("detectEmptyFiles", () => {
  it("detecteert bestanden kleiner dan 10 bytes", () => {
    const files = [makeFile("a.md", 5), makeFile("b.md", 200)];
    const result = detectEmptyFiles(files);
    expect(result).toHaveLength(1);
    expect(result[0].file.path).toBe("a.md");
    expect(result[0].type).toBe("empty");
  });

  it("geeft lege array als er geen lege bestanden zijn", () => {
    const files = [makeFile("a.md", 50)];
    expect(detectEmptyFiles(files)).toHaveLength(0);
  });
});

describe("detectDuplicateTags", () => {
  it("detecteert exacte duplicate tags in frontmatter", () => {
    const mockCache = { frontmatter: { tags: ["project", "project", "actief"] } };
    const file = makeFile("test.md");
    const result = detectDuplicateTags([{ file, cache: mockCache as any }]);
    expect(result).toHaveLength(1);
    expect(result[0].details).toContain("project");
  });

  it("geeft lege array bij unieke tags", () => {
    const mockCache = { frontmatter: { tags: ["project", "actief"] } };
    const file = makeFile("test.md");
    expect(detectDuplicateTags([{ file, cache: mockCache as any }])).toHaveLength(0);
  });

  it("slaat bestanden zonder tags over", () => {
    const mockCache = { frontmatter: {} };
    const file = makeFile("test.md");
    expect(detectDuplicateTags([{ file, cache: mockCache as any }])).toHaveLength(0);
  });
});

describe("detectOrphanInboxItems", () => {
  it("detecteert inbox bestanden ouder dan drempel", () => {
    const oldTime = Date.now() - 40 * 24 * 60 * 60 * 1000;
    const file = makeFile("inbox/oud.md", 100, oldTime);
    const result = detectOrphanInboxItems([file], "inbox/", 30);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("orphan");
  });

  it("laat recent inbox bestand ongemoeid", () => {
    const file = makeFile("inbox/nieuw.md", 100, Date.now());
    expect(detectOrphanInboxItems([file], "inbox/", 30)).toHaveLength(0);
  });
});

describe("buildFileBasenameSet", () => {
  it("bouwt set van alle basenames", () => {
    const files = [makeFile("projects/NOVA/NOVA.md"), makeFile("inbox/idee.md")];
    const set = buildFileBasenameSet(files);
    expect(set.has("NOVA")).toBe(true);
    expect(set.has("idee")).toBe(true);
  });
});
