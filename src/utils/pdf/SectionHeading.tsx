import { Text } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import React from "react";
import { styles, HEADING_RESERVE } from "./theme";

// A section (or sub-section) heading that never gets stranded alone at the
// bottom of a page. `minPresenceAhead` is a React-PDF NODE PROP (see
// node_modules/@react-pdf/types/node.d.ts), not a style: it tells the layout
// engine to break to a new page BEFORE this node whenever fewer than
// `reserve` points remain on the current one, so there's always room for the
// heading plus at least a bit of what follows it. `style` defaults to the
// main section-heading look (styles.heading) but can be overridden for a
// lighter sub-heading (e.g. "By module", a per-module/category label) — pass
// a smaller `reserve` (SUBHEADING_RESERVE) alongside it in that case.
export const SectionHeading: React.FC<{
  children: React.ReactNode;
  reserve?: number;
  style?: Style | Style[];
}> = ({ children, reserve = HEADING_RESERVE, style = styles.heading }) => (
  <Text style={style} minPresenceAhead={reserve}>
    {children}
  </Text>
);
