import React from "react";
import { render } from "@testing-library/react";
import { ModuleData, ProgressData } from "../../types/types";

// --- Mock react-chartjs-2 -------------------------------------------------
// Radar is stubbed as a passthrough that captures its `data` prop on a
// module-level variable, so the test can inspect exactly what SpiderChart
// builds without touching the real Chart.js canvas rendering.
let capturedData: {
  labels: string[];
  datasets: Record<string, unknown>[];
} | null = null;

jest.mock("react-chartjs-2", () => ({
  __esModule: true,
  Radar: (props: {
    data: { labels: string[]; datasets: Record<string, unknown>[] };
  }) => {
    capturedData = props.data;
    return null;
  },
}));

// chart.js registration is not relevant to this test and touches canvas
// internals jsdom doesn't implement; stub it as a no-op module.
jest.mock("chart.js", () => ({
  __esModule: true,
  Chart: { register: jest.fn() },
  RadialLinearScale: {},
  PointElement: {},
  LineElement: {},
  Filler: {},
  Tooltip: {},
  Legend: {},
  Title: {},
}));

import { SpiderChart } from "./SpiderChart";

describe("SpiderChart baseline overlay", () => {
  const modules: ModuleData[] = [
    {
      id: "G",
      name: "Governance",
      description: "",
      categories: [
        {
          id: "strategy-and-vision",
          weight: 1,
          name: "Strategy and vision",
          description: "",
          levels: [],
          requirements: [],
        },
      ],
    },
  ];

  const chartLabels = ["G.strategy-and-vision"];

  const progress: Record<string, ProgressData> = {
    "G.strategy-and-vision": {
      level: 3,
      result: "",
      description: "",
      applicability: true,
    },
  };

  const baselineProgress: Record<string, ProgressData> = {
    "G.strategy-and-vision": {
      level: 1,
      result: "",
      description: "",
      applicability: true,
    },
  };

  beforeEach(() => {
    capturedData = null;
  });

  it("does not include a Baseline dataset when baselineProgress is absent", () => {
    render(
      <SpiderChart
        modules={modules}
        progress={progress}
        chartLabels={chartLabels}
      />,
    );

    expect(capturedData).not.toBeNull();
    const labels = capturedData!.datasets.map((d) => d.label);
    expect(labels).not.toContain("Baseline");
    expect(capturedData!.datasets).toHaveLength(1);
  });

  it("includes a Baseline dataset when baselineProgress is provided", () => {
    render(
      <SpiderChart
        modules={modules}
        progress={progress}
        chartLabels={chartLabels}
        baselineProgress={baselineProgress}
      />,
    );

    expect(capturedData).not.toBeNull();
    const baselineDataset = capturedData!.datasets.find(
      (d) => d.label === "Baseline",
    );
    expect(baselineDataset).toBeDefined();
    expect(baselineDataset).toMatchObject({
      label: "Baseline",
      data: [1],
    });
  });

  it("uses identical axis labels whether or not a baseline is present", () => {
    render(
      <SpiderChart
        modules={modules}
        progress={progress}
        chartLabels={chartLabels}
      />,
    );
    const withoutBaselineLabels = capturedData!.labels;

    render(
      <SpiderChart
        modules={modules}
        progress={progress}
        chartLabels={chartLabels}
        baselineProgress={baselineProgress}
      />,
    );
    const withBaselineLabels = capturedData!.labels;

    expect(withBaselineLabels).toEqual(withoutBaselineLabels);
  });
});
