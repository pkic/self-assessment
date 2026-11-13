import React from "react";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import {
  ModuleData,
  ProgressData,
  ExtensionData,
  RequirementProgress,
} from "../../types/types";
import {
  calculateOverallMaturityLevel,
  calculateExtensionMaturityLevels,
  calculateBlendedLevel,
} from "../../assessment-engine/methodologies/weightedMaturity";
import { calculateEffectiveCategoryLevel } from "../../utils/effectiveLevel";
import { buildRadarAxes } from "../../utils/radarAxes";
import LevelResult from "../../enums/LevelResult";
import type { AssessmentProfileData } from "../../assessment-engine/types";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  Title,
);

interface SpiderChartProps {
  modules: ModuleData[];
  progress: Record<string, ProgressData>;
  /** Storage keys, e.g. `G.strategy-and-vision`. Used to read progress. */
  chartLabels: string[];
  extensions?: ExtensionData[];
  enabledExtensions?: string[];
  animate?: boolean;
  /** Requirement-grain progress. When present, full-mode categories derive
   *  their level from requirements instead of the category-level rating. */
  requirementProgress?: Record<string, RequirementProgress>;
  /** Optional baseline progress for a translucent comparison overlay series.
   *  Plotted on the SAME axisKeys as the current assessment; absent by
   *  default so the chart stays byte-identical to today. */
  baselineProgress?: Record<string, ProgressData>;
  baselineRequirementProgress?: Record<string, RequirementProgress>;
  methodology?: AssessmentProfileData["runtime"]["methodology"];
}

// Function to determine color based on the level
const getColorForLevel = (level: number) => {
  const rootStyle = getComputedStyle(document.documentElement);
  switch (level) {
    case 1:
      return {
        background:
          rootStyle.getPropertyValue("--pkimm-maturity-level-1") + "80",
        border: rootStyle.getPropertyValue("--pkimm-maturity-level-1"),
      };
    case 2:
      return {
        background:
          rootStyle.getPropertyValue("--pkimm-maturity-level-2") + "80",
        border: rootStyle.getPropertyValue("--pkimm-maturity-level-2"),
      };
    case 3:
      return {
        background:
          rootStyle.getPropertyValue("--pkimm-maturity-level-3") + "80",
        border: rootStyle.getPropertyValue("--pkimm-maturity-level-3"),
      };
    case 4:
      return {
        background:
          rootStyle.getPropertyValue("--pkimm-maturity-level-4") + "80",
        border: rootStyle.getPropertyValue("--pkimm-maturity-level-4"),
      };
    case 5:
      return {
        background:
          rootStyle.getPropertyValue("--pkimm-maturity-level-5") + "80",
        border: rootStyle.getPropertyValue("--pkimm-maturity-level-5"),
      };
    default:
      return { background: "rgba(0, 0, 0, 0.1)", border: "rgba(0, 0, 0, 1)" };
  }
};

const EXTENSION_COLORS = [
  { background: "#007bff80", border: "#007bff" }, // Blue
  { background: "#dc354580", border: "#dc3545" }, // Red
  { background: "#ffc10780", border: "#ffc107" }, // Amber
  { background: "#17a2b880", border: "#17a2b8" }, // Cyan
  { background: "#6610f280", border: "#6610f2" }, // Indigo
  { background: "#e83e8c80", border: "#e83e8c" }, // Pink
  { background: "#fd7e1480", border: "#fd7e14" }, // Orange
  { background: "#20c99780", border: "#20c997" }, // Teal
];

export const SpiderChart: React.FC<SpiderChartProps> = ({
  modules,
  progress,
  chartLabels,
  extensions = [],
  enabledExtensions = [],
  animate = true,
  requirementProgress,
  baselineProgress,
  baselineRequirementProgress,
  methodology,
}) => {
  // Not-Applicable categories (baseline display === -1) are removed from the
  // radar axes entirely rather than plotted as 0 — plotting N/A at the
  // origin misreads as "assessed at the bottom". Bind the filtered axis list
  // ONCE here and derive every dataset (display labels, the achieved-level
  // series, and each extension series below) from this single array so they
  // can never drift out of alignment with each other.
  const axisKeys = buildRadarAxes(
    modules,
    chartLabels,
    progress,
    requirementProgress,
  );

  // axisKeys are storage keys (G.kebab-id). Build display labels
  // ("Governance · Strategy and vision") parallel to the storage keys so
  // tooltips can show a human-readable category name without exposing the
  // kebab id on the chart axes.
  const displayLabels = axisKeys.map((key) => {
    const [moduleId, categoryId] = key.split(".");
    const moduleData = modules.find((m) => m.id === moduleId);
    const category = moduleData?.categories.find((c) => c.id === categoryId);
    return moduleData && category
      ? `${moduleData.name} · ${category.name}`
      : key;
  });

  const userData = axisKeys.map((label) => {
    const [moduleId, categoryId] = label.split(".");
    const module = modules.find((m) => m.id === moduleId);
    const category = module?.categories.find((c) => c.id === categoryId);
    if (module && category) {
      const eff = calculateEffectiveCategoryLevel(
        moduleId,
        category,
        progress,
        requirementProgress,
      );
      return eff.display === -1 ? 0 : eff.display;
    }
    // Fallback preserves prior behavior for any non-standard label.
    if (progress[label] && !progress[label].applicability) {
      return 0;
    }
    return progress[label]?.level || 0;
  });

  const baselineData = baselineProgress
    ? axisKeys.map((label) => {
        const [moduleId, categoryId] = label.split(".");
        const category = modules
          .find((m) => m.id === moduleId)
          ?.categories.find((c) => c.id === categoryId);
        if (!category) return 0;
        const eff = calculateEffectiveCategoryLevel(
          moduleId,
          category,
          baselineProgress,
          baselineRequirementProgress,
        );
        return eff.display === -1 ? 0 : eff.display;
      })
    : null;

  const maxLevel = 5; // Each question can have a level from 1 to 5

  const overallMaturityLevel = calculateOverallMaturityLevel(
    modules,
    progress,
    [],
    [],
    requirementProgress,
    methodology?.parameters,
  );
  const { background, border } = getColorForLevel(overallMaturityLevel);

  const extensionMaturityLevels = calculateExtensionMaturityLevels(
    modules,
    extensions,
    enabledExtensions,
    progress,
    requirementProgress,
    methodology?.parameters,
  );

  const datasets = [
    {
      label: "Achieved PKI Maturity Level",
      data: userData,
      backgroundColor: background,
      borderColor: border,
      borderWidth: 1,
    },
    ...(baselineData
      ? [
          {
            label: "Baseline",
            data: baselineData,
            backgroundColor: "rgba(120,120,120,0.15)",
            borderColor: "rgba(120,120,120,0.9)",
            borderDash: [4, 4],
            pointRadius: 2,
          },
        ]
      : []),
  ];

  extensions.forEach((ext, index) => {
    if (enabledExtensions.includes(ext.extension.id)) {
      const extData = axisKeys.map((label) => {
        const [moduleId, categoryId] = label.split(".");
        const module = modules.find((m) => m.id === moduleId);
        const category = module?.categories.find((c) => c.id === categoryId);

        if (module && category) {
          const blendedLevel = calculateBlendedLevel(
            moduleId,
            category,
            ext,
            progress,
            requirementProgress,
          );
          return blendedLevel === -1 ? 0 : Math.floor(blendedLevel);
        }
        return 0;
      });

      const colorIndex = index % EXTENSION_COLORS.length;
      const { background: extBg, border: extBorder } =
        EXTENSION_COLORS[colorIndex];

      datasets.push({
        label: `${ext.extension.name}`,
        data: extData,
        backgroundColor: extBg,
        borderColor: extBorder,
        borderWidth: 1,
      });
    }
  });

  const chartData = {
    labels: displayLabels,
    datasets,
  };

  const chartOptions = {
    animation: animate ? ({} as const) : (false as const),
    scales: {
      r: {
        beginAtZero: true,
        min: 0,
        max: maxLevel,
        ticks: {
          stepSize: 1,
          display: false,
        },
        pointLabels: {
          // Hide the per-axis category labels — they cramp the chart with 16
          // axes. Category names are surfaced via tooltips instead.
          display: false,
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          title: (items: { label: string }[]) =>
            items.length > 0 ? items[0].label : "",
          label: (item: { dataset: { label?: string }; raw: unknown }) => {
            const v = typeof item.raw === "number" ? item.raw : 0;
            const result = (LevelResult as Record<number, string>)[v];
            return `${item.dataset.label ?? "Level"}: ${v} (${result})`;
          },
        },
      },
    },
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontWeight: "bold",
            color: getComputedStyle(document.documentElement).getPropertyValue(
              `--pkimm-maturity-level-${overallMaturityLevel}`,
            ),
            margin: "0",
          }}
        >
          {LevelResult[overallMaturityLevel]}
        </p>
        {extensionMaturityLevels.map(({ id, name, level }, index) => {
          const colorIndex = index % EXTENSION_COLORS.length;
          const { border: extColor } = EXTENSION_COLORS[colorIndex];
          return (
            <p
              key={id}
              style={{
                fontSize: "0.9em",
                color: extColor,
                margin: "5px 0 0 0",
              }}
            >
              {name}: <strong>{LevelResult[level]}</strong>
            </p>
          );
        })}
      </div>
      <Radar data={chartData} options={chartOptions} />
    </div>
  );
};
