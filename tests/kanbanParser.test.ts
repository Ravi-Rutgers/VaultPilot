import { describe, it, expect } from "vitest";
import { TFile } from "obsidian";
import { parseKanbanTasks, updateTaskStatus, nextStatus, extractLabel, priorityOrder, appendTaskToContent, loadTasksFromFolder, deleteTask } from "../src/core/kanbanParser";

const mockFile = { path: "projects/Test/Test.md", basename: "Test" } as TFile;

describe("parseKanbanTasks", () => {
  it("parses todo tasks", () => {
    const tasks = parseKanbanTasks("- [ ] Eerste taak\n- [ ] Tweede taak", mockFile);
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toMatchObject({ text: "Eerste taak", status: "todo", lineNumber: 0 });
  });

  it("parses doing tasks", () => {
    const tasks = parseKanbanTasks("- [/] Bezig met dit", mockFile);
    expect(tasks[0]).toMatchObject({ text: "Bezig met dit", status: "doing" });
  });

  it("parses done tasks", () => {
    const tasks = parseKanbanTasks("- [x] Afgerond", mockFile);
    expect(tasks[0]).toMatchObject({ text: "Afgerond", status: "done" });
  });

  it("ignores non-task lines", () => {
    const content = "# Kop\n\nGewone tekst\n- [ ] Taak\n> Quote";
    const tasks = parseKanbanTasks(content, mockFile);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].text).toBe("Taak");
  });

  it("preserves line numbers", () => {
    const content = "regel 0\n- [ ] Taak op regel 1\nregel 2\n- [x] Klaar op regel 3";
    const tasks = parseKanbanTasks(content, mockFile);
    expect(tasks[0].lineNumber).toBe(1);
    expect(tasks[1].lineNumber).toBe(3);
  });
});

describe("updateTaskStatus", () => {
  it("wijzigt todo naar doing", () => {
    const result = updateTaskStatus("- [ ] Taak", 0, "doing");
    expect(result).toBe("- [/] Taak");
  });

  it("wijzigt doing naar done", () => {
    const result = updateTaskStatus("- [/] Bezig", 0, "done");
    expect(result).toBe("- [x] Bezig");
  });

  it("wijzigt done naar todo", () => {
    const result = updateTaskStatus("- [x] Klaar", 0, "todo");
    expect(result).toBe("- [ ] Klaar");
  });

  it("raakt andere regels niet aan", () => {
    const content = "regel 0\n- [ ] Taak\nregel 2";
    const result = updateTaskStatus(content, 1, "done");
    expect(result).toBe("regel 0\n- [x] Taak\nregel 2");
  });
});

describe("nextStatus", () => {
  it("todo → doing", () => expect(nextStatus("todo")).toBe("doing"));
  it("doing → done", () => expect(nextStatus("doing")).toBe("done"));
  it("done → todo", () => expect(nextStatus("done")).toBe("todo"));
});

describe("extractLabel", () => {
  it("geeft null terug als er geen label is", () => {
    expect(extractLabel("Gewone taak")).toEqual({ label: null, cleanText: "Gewone taak" });
  });

  it("herkent #hoog", () => {
    expect(extractLabel("Fix bug #hoog")).toEqual({ label: "hoog", cleanText: "Fix bug" });
  });

  it("herkent #midden", () => {
    expect(extractLabel("Schrijf docs #midden")).toEqual({ label: "midden", cleanText: "Schrijf docs" });
  });

  it("herkent #laag", () => {
    expect(extractLabel("Refactor later #laag")).toEqual({ label: "laag", cleanText: "Refactor later" });
  });

  it("label midden in de tekst", () => {
    const result = extractLabel("Fix #hoog dit probleem");
    expect(result.label).toBe("hoog");
    expect(result.cleanText).toBe("Fix dit probleem");
  });

  it("negeert onbekende hashtags", () => {
    expect(extractLabel("Fix #typo bug")).toEqual({ label: null, cleanText: "Fix #typo bug" });
  });

  it("label aan het begin van de tekst", () => {
    const result = extractLabel("#hoog Fix dit probleem");
    expect(result.label).toBe("hoog");
    expect(result.cleanText).toBe("Fix dit probleem");
  });

  it("lege string geeft null terug", () => {
    expect(extractLabel("")).toEqual({ label: null, cleanText: "" });
  });

  it("eerste label wint bij meerdere labels", () => {
    const result = extractLabel("Fix #hoog dit #midden probleem");
    expect(result.label).toBe("hoog");
    expect(result.cleanText).toBe("Fix dit #midden probleem");
  });

  it("herkent #kritiek", () => {
    expect(extractLabel("Productie is down #kritiek")).toEqual({ label: "kritiek", cleanText: "Productie is down" });
  });

  it("#kritiek aan het begin", () => {
    const result = extractLabel("#kritiek Fix dit nu");
    expect(result.label).toBe("kritiek");
    expect(result.cleanText).toBe("Fix dit nu");
  });

  it("#kritiek wint van #hoog als het eerste staat", () => {
    const result = extractLabel("Fix #kritiek dit #hoog probleem");
    expect(result.label).toBe("kritiek");
    expect(result.cleanText).toBe("Fix dit #hoog probleem");
  });
});

describe("priorityOrder", () => {
  it("kritiek heeft volgorde 1", () => expect(priorityOrder("kritiek")).toBe(1));
  it("hoog heeft volgorde 2", () => expect(priorityOrder("hoog")).toBe(2));
  it("midden heeft volgorde 3", () => expect(priorityOrder("midden")).toBe(3));
  it("laag heeft volgorde 4", () => expect(priorityOrder("laag")).toBe(4));
  it("null (geen label) heeft volgorde 5", () => expect(priorityOrder(null)).toBe(5));
});

describe("appendTaskToContent", () => {
  it("voegt todo taak toe aan einde van bestand", () => {
    const result = appendTaskToContent("# Project\n\nBestaande inhoud", "Nieuwe taak", "todo");
    expect(result).toBe("# Project\n\nBestaande inhoud\n- [ ] Nieuwe taak");
  });

  it("voegt doing taak toe", () => {
    const result = appendTaskToContent("", "Bezig", "doing");
    expect(result).toBe("- [/] Bezig");
  });

  it("voegt done taak toe", () => {
    const result = appendTaskToContent("bestaand", "Klaar", "done");
    expect(result).toBe("bestaand\n- [x] Klaar");
  });

  it("bestand eindigt al op newline", () => {
    const result = appendTaskToContent("inhoud\n", "Taak", "todo");
    expect(result).toBe("inhoud\n- [ ] Taak");
  });
});

describe("loadTasksFromFolder", () => {
  it("laadt taken uit meerdere bestanden", async () => {
    const file1 = { path: "projects/P/P.md", basename: "P" } as TFile;
    const file2 = { path: "projects/P/sub/dag.md", basename: "dag" } as TFile;
    const mockApp = {
      vault: {
        getMarkdownFiles: () => [file1, file2],
        read: async (f: TFile) =>
          f.path === file1.path ? "- [ ] Taak A" : "- [x] Taak B",
      },
    } as any;
    const tasks = await loadTasksFromFolder(mockApp, "projects/P/");
    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.text)).toContain("Taak A");
    expect(tasks.map((t) => t.text)).toContain("Taak B");
  });

  it("slaat bestanden buiten de map over", async () => {
    const file = { path: "inbox/note.md", basename: "note" } as TFile;
    const mockApp = {
      vault: {
        getMarkdownFiles: () => [file],
        read: async () => "- [ ] Taak",
      },
    } as any;
    const tasks = await loadTasksFromFolder(mockApp, "projects/P/");
    expect(tasks).toHaveLength(0);
  });

  it("geeft lege array bij map zonder taken", async () => {
    const file = { path: "projects/P/leeg.md", basename: "leeg" } as TFile;
    const mockApp = {
      vault: {
        getMarkdownFiles: () => [file],
        read: async () => "# Geen taken hier",
      },
    } as any;
    const tasks = await loadTasksFromFolder(mockApp, "projects/P/");
    expect(tasks).toHaveLength(0);
  });
});

describe("deleteTask", () => {
  it("verwijdert de regel op het opgegeven regelnummer", () => {
    const content = "# Kop\n- [ ] Taak A\n- [ ] Taak B\n- [ ] Taak C";
    const result = deleteTask(content, 1);
    expect(result).toBe("# Kop\n- [ ] Taak B\n- [ ] Taak C");
  });

  it("verwijdert de eerste regel", () => {
    const result = deleteTask("- [ ] Enige taak\nRegel 2", 0);
    expect(result).toBe("Regel 2");
  });

  it("verwijdert de laatste regel", () => {
    const result = deleteTask("Regel 0\n- [ ] Laatste taak", 1);
    expect(result).toBe("Regel 0");
  });

  it("retourneert content ongewijzigd bij ongeldig regelnummer", () => {
    const content = "- [ ] Taak";
    expect(deleteTask(content, 99)).toBe(content);
  });

  it("retourneert content ongewijzigd bij negatief regelnummer", () => {
    const content = "- [ ] Taak";
    expect(deleteTask(content, -1)).toBe(content);
  });
});
