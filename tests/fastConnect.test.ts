import { describe, it, expect } from "vitest";
import {
  findRuleBasedSuggestions,
  isDuplicateLink,
  buildSuggestionId,
} from "../src/core/fastConnect";

const files = [
  { path: "projects/VaultPilot/VaultPilot.md", basename: "VaultPilot" },
  { path: "projects/NOVA/NOVA.md", basename: "NOVA" },
  { path: "ideas/GraphIdea.md", basename: "GraphIdea" },
  { path: "inbox/TODO.md", basename: "TODO" },
];

const resolvedLinks: Record<string, Record<string, number>> = {
  "projects/VaultPilot/VaultPilot.md": {
    "ideas/GraphIdea.md": 1,
  },
  "projects/NOVA/NOVA.md": {},
  "ideas/GraphIdea.md": {},
  "inbox/TODO.md": {},
};

const fileContents: Record<string, string> = {
  "projects/NOVA/NOVA.md": "Dit project is gerelateerd aan VaultPilot en ook aan TODO.",
  "projects/VaultPilot/VaultPilot.md": "Hoofd project.",
  "ideas/GraphIdea.md": "Idee voor de graph.",
  "inbox/TODO.md": "Dingen om te doen.",
};

describe("buildSuggestionId", () => {
  it("combineert source en target met pijl", () => {
    expect(buildSuggestionId("a.md", "b.md")).toBe("a.md→b.md");
  });
});

describe("isDuplicateLink", () => {
  it("geeft true als link al bestaat", () => {
    expect(
      isDuplicateLink(
        "projects/VaultPilot/VaultPilot.md",
        "ideas/GraphIdea.md",
        resolvedLinks
      )
    ).toBe(true);
  });

  it("geeft false als link nog niet bestaat", () => {
    expect(
      isDuplicateLink(
        "projects/NOVA/NOVA.md",
        "ideas/GraphIdea.md",
        resolvedLinks
      )
    ).toBe(false);
  });
});

describe("findRuleBasedSuggestions", () => {
  it("vindt naamvermelding zonder wikilink", () => {
    const suggestions = findRuleBasedSuggestions(files, fileContents, resolvedLinks);
    const found = suggestions.find(
      (s) =>
        s.source === "projects/NOVA/NOVA.md" &&
        s.target === "projects/VaultPilot/VaultPilot.md"
    );
    expect(found).toBeDefined();
    expect(found?.method).toBe("rule");
    expect(found?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("slaat bestaande links over", () => {
    const suggestions = findRuleBasedSuggestions(files, fileContents, resolvedLinks);
    const dup = suggestions.find(
      (s) =>
        s.source === "projects/VaultPilot/VaultPilot.md" &&
        s.target === "ideas/GraphIdea.md"
    );
    expect(dup).toBeUndefined();
  });

  it("slaat self-links over", () => {
    const suggestions = findRuleBasedSuggestions(files, fileContents, resolvedLinks);
    const self = suggestions.find((s) => s.source === s.target);
    expect(self).toBeUndefined();
  });

  it("geeft status pending terug", () => {
    const suggestions = findRuleBasedSuggestions(files, fileContents, resolvedLinks);
    expect(suggestions.every((s) => s.status === "pending")).toBe(true);
  });
});
