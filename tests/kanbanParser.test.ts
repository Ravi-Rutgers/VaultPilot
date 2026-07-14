import { describe, it, expect } from "vitest";
import { TFile } from "obsidian";
import { parseKanbanTasks, updateTaskStatus, nextStatus, extractLabel } from "../src/core/kanbanParser";

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
});
