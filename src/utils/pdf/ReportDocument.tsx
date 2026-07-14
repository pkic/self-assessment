import React from "react";
import { Document, Page, View } from "@react-pdf/renderer";
import { styles, SECTION_GAP } from "./theme";
import { Header, Footer } from "./primitives";
import {
  SECTION_REGISTRY,
  PAGE_BREAK_BEFORE,
  type SectionKey,
} from "./sections/registry";
import type { SectionContext } from "./sections/SectionContext";

// The single renderer every tier (Attestation/Assessment/Detailed/Custom)
// goes through: an ordered SectionKey[] against one SectionContext. Sections
// are rendered up front and nulls dropped, then grouped into PAGE GROUPS:
// consecutive flowing sections share one wrapping <Page>, and every
// PAGE_BREAK_BEFORE section starts a genuinely new <Page> element. Real Page
// elements are the only deterministic fresh-page mechanism in @react-pdf
// v4.5.1 — a `break` prop fired when the preceding content happens to end
// exactly at a page boundary emits a spurious BLANK page (the engine breaks
// again from the top of the already-fresh page), and that is data-dependent,
// so `break` views are not used at all here. A null section contributes
// nothing (never an empty page), and a group always begins with a rendered
// section, so no Page element can be blank.
//
// Spacing between sections is also decided HERE, uniformly: the first
// section of each page group starts flush under the header; every subsequent
// section in the group gets SECTION_GAP as a marginTop wrapper. Individual
// sections must not carry their own section-root top margin, or it would
// double up with this one.
export const ReportDocument: React.FC<{
  ctx: SectionContext;
  sections: SectionKey[];
}> = ({ ctx, sections }) => {
  const hasCover = sections.includes("cover");
  const bodyKeys = sections.filter((k) => k !== "cover");
  const rendered = bodyKeys
    .map((k) => ({ k, el: SECTION_REGISTRY[k](ctx) }))
    .filter(
      (r): r is { k: (typeof bodyKeys)[number]; el: React.ReactElement } =>
        r.el !== null,
    );

  const groups: (typeof rendered)[] = [];
  rendered.forEach((r, i) => {
    if (i === 0 || PAGE_BREAK_BEFORE.has(r.k)) {
      groups.push([r]);
    } else {
      groups[groups.length - 1].push(r);
    }
  });

  return (
    <Document>
      {hasCover && SECTION_REGISTRY.cover(ctx)}
      {groups.map((group) => (
        <Page key={group[0].k} size="A4" style={styles.page} wrap>
          <Header />
          {group.map(({ k, el }, i) =>
            i === 0 ? (
              <React.Fragment key={k}>{el}</React.Fragment>
            ) : (
              <View key={k} style={{ marginTop: SECTION_GAP }}>
                {el}
              </View>
            ),
          )}
          <Footer
            assessmentUrl={ctx.assessmentUrl}
            version={ctx.version}
            showShareLink={ctx.showShareLink}
          />
        </Page>
      ))}
    </Document>
  );
};
