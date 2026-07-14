import { useRef, useState } from "react";

export interface ChartCapture {
  chartRef: React.RefObject<HTMLDivElement | null>;
  chartExtensionsOverride: string[] | null;
  chartAnimate: boolean;
  beginCapture: (overrideIds: string[]) => void;
  endCapture: () => void;
}

export const useChartCapture = (): ChartCapture => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [chartExtensionsOverride, setChartExtensionsOverride] = useState<
    string[] | null
  >(null);
  const [chartAnimate, setChartAnimate] = useState(true);
  const beginCapture = (overrideIds: string[]) => {
    setChartExtensionsOverride(overrideIds);
    setChartAnimate(false);
  };
  const endCapture = () => {
    setChartExtensionsOverride(null);
    setChartAnimate(true);
  };
  return {
    chartRef,
    chartExtensionsOverride,
    chartAnimate,
    beginCapture,
    endCapture,
  };
};
