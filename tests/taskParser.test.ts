import { describe, it, expect } from "vitest";
import { parseOpenTasks } from "../src/core/taskParser";

const mockFile = { basename: "test.md", path: "test.md" } as any;

describe("parseOpenTasks", () => {
  it("vindt open taken", () => {
    const content = "- [ ] Eerste taak\n- [x] Al gedaan\n- [ ] Tweede taak";
    const result = parseOpenTasks(content, mockFile);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("Eerste taak");
    expect(result[0].lineNumber).toBe(0);
    expect(result[1].text).toBe("Tweede taak");
    expect(result[1].lineNumber).toBe(2);
  });

  it("geeft lege array bij geen taken", () => {
    const result = parseOpenTasks("Gewone tekst zonder taken", mockFile);
    expect(result).toHaveLength(0);
  });

  it("negeert afgevinkte taken", () => {
    const result = parseOpenTasks("- [x] Klaar\n- [X] Ook klaar", mockFile);
    expect(result).toHaveLength(0);
  });

  it("hecht het juiste bestand aan elke taak", () => {
    const result = parseOpenTasks("- [ ] Taak", mockFile);
    expect(result[0].file).toBe(mockFile);
  });
});
