import { HELP_CONTENT } from "./helpContent";
import type { HelpTopicKey } from "./helpTopics";

const ALL_KEYS: HelpTopicKey[] = [
  "overview",
  "scope",
  "workspace",
  "rating",
  "extension-rating",
  "action-plans",
  "evaluation",
  "report",
  "extensions",
  "assessments",
  "workflow",
  "glossary",
  "faq",
];
const DEEP_LINK_SECTIONS = [
  "rating-levels",
  "applicability",
  "notes-evidence",
  "workspace-links",
];

describe("HELP_CONTENT", () => {
  it("has a populated topic for every key", () => {
    for (const k of ALL_KEYS) {
      const t = HELP_CONTENT[k];
      expect(t).toBeDefined();
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.self.length).toBeGreaterThan(0);
      expect(t.full.length).toBeGreaterThan(0);
      for (const s of [...t.self, ...t.full])
        expect(s.body.length).toBeGreaterThan(0);
    }
  });
  it("exposes every per-spot deep-link section id in rating and extension-rating, in BOTH views", () => {
    // Self must carry the same anchors as Full: a per-spot help trigger
    // opens whichever view is currently active.
    for (const key of ["rating", "extension-rating"] as const) {
      for (const view of ["self", "full"] as const) {
        const ids = new Set(
          HELP_CONTENT[key][view].map((s) => s.id).filter(Boolean),
        );
        for (const dl of DEEP_LINK_SECTIONS) expect(ids.has(dl)).toBe(true);
      }
    }
  });
});
