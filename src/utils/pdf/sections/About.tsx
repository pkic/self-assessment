import React from "react";
import { AboutPageBody } from "../AboutPage";
import type { SectionComponent } from "./SectionContext";

// The canonical "About PKI Maturity Model" content (shared with the self and
// extension reports via AboutPageBody — see ../AboutPage.tsx). Always
// renders, regardless of tier or assessment content.
export const About: SectionComponent = () => <AboutPageBody />;
