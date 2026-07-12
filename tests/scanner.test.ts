import { describe, it, expect } from "vitest";
import { filterProjectFiles, filterActiveProjects, getRecentFiles } from "../src/core/scanner";

const makeFile = (path: string, mtime = Date.now()) =>
  ({ path, basename: path.split("/").pop()!.replace(".md", ""), stat: { mtime } } as any);

const makeCacheEntry = (file: any, status: string) => ({
  file,
  frontmatter: { status },
});

describe("filterProjectFiles", () => {
  it("filtert alleen directe project root bestanden", () => {
    const files = [
      makeFile("projects/NOVA/NOVA.md"),
      makeFile("projects/NOVA/notes.md"),
      makeFile("projects/NOVA/juli/12-07-2026.md"),
      makeFile("inbox/idee.md"),
    ];
    const result = filterProjectFiles(files, "projects/");
    expect(result).toHaveLength(1);
    expect(result[0].basename).toBe("NOVA");
  });
});

describe("filterActiveProjects", () => {
  it("behoudt alleen projecten met status actief", () => {
    const files = [makeFile("projects/A/A.md"), makeFile("projects/B/B.md")];
    const caches = [
      makeCacheEntry(files[0], "actief"),
      makeCacheEntry(files[1], "archief"),
    ];
    const result = filterActiveProjects(files, caches);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("A");
    expect(result[0].status).toBe("actief");
  });

  it("geeft lege array als er geen actieve projecten zijn", () => {
    const files = [makeFile("projects/A/A.md")];
    const caches = [makeCacheEntry(files[0], "archief")];
    expect(filterActiveProjects(files, caches)).toHaveLength(0);
  });
});

describe("getRecentFiles", () => {
  it("sorteert op mtime en beperkt resultaten", () => {
    const files = [
      makeFile("a.md", 1000),
      makeFile("b.md", 3000),
      makeFile("c.md", 2000),
    ];
    const result = getRecentFiles(files, 2);
    expect(result[0].basename).toBe("b");
    expect(result[1].basename).toBe("c");
    expect(result).toHaveLength(2);
  });
});
