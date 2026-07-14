import React, { useEffect, useRef } from "react";
import { IconButton } from "../ui";
import { useTabScroll } from "./hooks/useTabScroll";
import { getContentTabs } from "./contentTabs";

export interface TabNavProps {
  modules: { id: string; name: string }[];
  currentTab: string | null;
  fullMode: boolean;
  onSelect: (tab: string) => void;
}

export const TabNav: React.FC<TabNavProps> = ({
  modules,
  currentTab,
  fullMode,
  onSelect,
}) => {
  const tabScroll = useTabScroll();
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const { scrollActiveIntoView } = tabScroll;

  useEffect(() => {
    scrollActiveIntoView(activeTabRef.current);
  }, [currentTab, fullMode, scrollActiveIntoView]);

  const tabRef = (tab: string) =>
    tab === currentTab ? activeTabRef : undefined;

  return (
    <div className="pkimm-tabs-scroller">
      <span
        className="pkimm-tabs-fade pkimm-tabs-fade--left"
        aria-hidden="true"
        data-visible={tabScroll.canScrollLeft}
      />
      {tabScroll.canScrollLeft && (
        <IconButton
          className="pkimm-tabs-arrow pkimm-tabs-arrow--left"
          label="Scroll tabs left"
          onClick={() => tabScroll.scrollByChunk(-1)}
        >
          ‹
        </IconButton>
      )}
      <nav
        className="pkimm-tabs"
        ref={tabScroll.ref as React.RefObject<HTMLElement>}
        aria-label="Assessment sections"
      >
        <div className="pkimm-tabs__group pkimm-tabs__group--content">
          {getContentTabs(modules, fullMode).map((tab) => (
            <button
              key={tab.id}
              ref={tabRef(tab.id)}
              className={currentTab === tab.id ? "active" : ""}
              onClick={() => onSelect(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="pkimm-tabs__group pkimm-tabs__group--meta">
          <button
            ref={tabRef("extensions")}
            className={currentTab === "extensions" ? "active" : ""}
            onClick={() => onSelect("extensions")}
          >
            Extensions
          </button>
          <button
            ref={tabRef("assessments")}
            className={currentTab === "assessments" ? "active" : ""}
            onClick={() => onSelect("assessments")}
          >
            Assessments
          </button>
        </div>
      </nav>
      {tabScroll.canScrollRight && (
        <IconButton
          className="pkimm-tabs-arrow pkimm-tabs-arrow--right"
          label="Scroll tabs right"
          onClick={() => tabScroll.scrollByChunk(1)}
        >
          ›
        </IconButton>
      )}
      <span
        className="pkimm-tabs-fade pkimm-tabs-fade--right"
        aria-hidden="true"
        data-visible={tabScroll.canScrollRight}
      />
    </div>
  );
};
