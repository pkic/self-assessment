import React from "react";
import { CoverPage } from "../primitives";
import type { SectionComponent } from "./SectionContext";

// The standalone cover `<Page>` for the Attestation/Assessment/Detailed/
// Custom tiers. Reuses `CoverPage` from primitives so the QR + "Scan to open
// the assessment" caption stay gated behind `showShareLink && qrImgData` in
// exactly one place — `toSectionContext` stamps `showShareLink: false` for
// every tier this registry serves, so those tiers render QR-free even when a
// `qrImgData` happens to be supplied.
export const Cover: SectionComponent = (ctx) => (
  <CoverPage
    version={ctx.version}
    reportTitle={ctx.reportTitle}
    qrImgData={ctx.qrImgData}
    showShareLink={ctx.showShareLink}
  />
);
