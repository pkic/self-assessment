import { TimelineSection } from "../TimelineSection";
import type { SectionComponent } from "./SectionContext";

// Wraps the existing TimelineSection (over buildTimeline). `alwaysShow` is
// true only for the attestation tier (ctx.timelineAlwaysShow, set by
// toSectionContext/the dispatcher). TimelineSection is a hook-free function
// component, so it's called directly here (not as JSX) — a SectionComponent
// must return its null-ness synchronously (see SectionContext.ts) so
// ReportDocument can filter it out before deciding page breaks; wrapping it
// in JSX would only defer that decision to React's own render pass instead.
export const Timeline: SectionComponent = (ctx) =>
  TimelineSection({
    startDate: ctx.startDate,
    targetDate: ctx.targetDate,
    finishDate: ctx.finishDate,
    alwaysShow: ctx.timelineAlwaysShow,
  });
