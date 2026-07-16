import React from "react";
import type { ModuleData, RequirementProgress } from "../../types/types";
import {
  buildRequirementViews,
  matchesFilter,
  type RequirementFilterState,
} from "../../utils/requirementFilter";
import "./Category.module.scss";

export interface RequirementFinderProps {
  module: ModuleData;
  requirementProgress: Record<string, RequirementProgress> | undefined;
  filter: RequirementFilterState;
  onFilterChange: (f: RequirementFilterState) => void;
  onJump: (key: string) => void; // scroll + focus the chosen requirement card
}

type StatusToken =
  RequirementFilterState["statuses"] extends Set<infer T> ? T : never;

const STATUS_CHIPS: { token: StatusToken; label: string }[] = [
  { token: "not-assessed", label: "Not Assessed" },
  { token: "1", label: "1" },
  { token: "2", label: "2" },
  { token: "3", label: "3" },
  { token: "4", label: "4" },
  { token: "5", label: "5" },
  { token: "na", label: "N-A" },
  { token: "completed", label: "Completed" },
  { token: "flagged", label: "Flagged" },
];

export const RequirementFinder: React.FC<RequirementFinderProps> = ({
  module,
  requirementProgress,
  filter,
  onFilterChange,
  onJump,
}) => {
  const toggleStatus = (token: StatusToken): void => {
    const next = new Set(filter.statuses);
    if (next.has(token)) next.delete(token);
    else next.add(token);
    onFilterChange({ ...filter, statuses: next });
  };

  // Build the flat view list once per module/progress change; re-filter only
  // when the filter changes, so typing in the search box stays responsive.
  const allViews = React.useMemo(
    () =>
      module.categories.flatMap((category) =>
        buildRequirementViews(module.id, category, requirementProgress).map(
          (view) => ({ view, categoryName: category.name }),
        ),
      ),
    [module, requirementProgress],
  );
  const matches = React.useMemo(
    () => allViews.filter(({ view }) => matchesFilter(view, filter)),
    [allViews, filter],
  );

  return (
    <div className="pkimm-requirement-finder">
      <div className="pkimm-requirement-finder__controls">
        <input
          type="search"
          role="searchbox"
          aria-label="Search requirements"
          className="pkimm-requirement-finder__search"
          placeholder="Search requirements…"
          value={filter.text}
          onChange={(e) => onFilterChange({ ...filter, text: e.target.value })}
        />
        <div className="pkimm-requirement-finder__chips">
          {STATUS_CHIPS.map(({ token, label }) => {
            const active = filter.statuses.has(token);
            return (
              <button
                key={token}
                type="button"
                className={`pkimm-requirement-finder__chip ${
                  active ? "active" : ""
                }`}
                aria-pressed={active}
                onClick={() => toggleStatus(token)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <ul
        aria-label="matching requirements"
        className="pkimm-requirement-finder__list"
      >
        {matches.map(({ view, categoryName }) => (
          <li key={view.key} className="pkimm-requirement-finder__item">
            <button
              type="button"
              className="pkimm-requirement-finder__row"
              onClick={() => onJump(view.key)}
            >
              <span className="pkimm-requirement-finder__category">
                {categoryName}
              </span>
              <span className="pkimm-requirement-finder__description">
                {view.description}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
