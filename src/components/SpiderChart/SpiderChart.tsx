import React from 'react';
import { Radar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
    Title
} from 'chart.js';
import { ModuleData, ProgressData } from "../../types/types";
import { calculateOverallMaturityLevel } from "../../utils/maturityCalculations";
import LevelResult from "../../enums/LevelResult";

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
    Title
);

interface SpiderChartProps {
    modules: ModuleData[];
    progress: Record<string, ProgressData>;
    chartLabels: string[];
}

// Function to determine color based on the level
const getColorForLevel = (level: number) => {
    switch (level) {
        case 1: return { background: getComputedStyle(document.documentElement).getPropertyValue('--pkimm-maturity-level-1') + '80', border: getComputedStyle(document.documentElement).getPropertyValue('--pkimm-maturity-level-1') };
        case 2: return { background: getComputedStyle(document.documentElement).getPropertyValue('--pkimm-maturity-level-2') + '80', border: getComputedStyle(document.documentElement).getPropertyValue('--pkimm-maturity-level-2') };
        case 3: return { background: getComputedStyle(document.documentElement).getPropertyValue('--pkimm-maturity-level-3') + '80', border: getComputedStyle(document.documentElement).getPropertyValue('--pkimm-maturity-level-3') };
        case 4: return { background: getComputedStyle(document.documentElement).getPropertyValue('--pkimm-maturity-level-4') + '80', border: getComputedStyle(document.documentElement).getPropertyValue('--pkimm-maturity-level-4') };
        case 5: return { background: getComputedStyle(document.documentElement).getPropertyValue('--pkimm-maturity-level-5') + '80', border: getComputedStyle(document.documentElement).getPropertyValue('--pkimm-maturity-level-5') };
        default: return { background: 'rgba(0, 0, 0, 0.1)', border: 'rgba(0, 0, 0, 1)' };
    }
};

export const SpiderChart: React.FC<SpiderChartProps> = ({ modules, progress, chartLabels }) => {
    const labels = chartLabels;

    const userData = labels.map((label) => {
        if (!progress[label].applicability) {
            return 0;
        }
        return progress[label].level || 0;
    });

    const maxLevel = 5; // Each question can have a level from 1 to 5

    const overallMaturityLevel = calculateOverallMaturityLevel(modules, progress);
    const { background, border } = getColorForLevel(overallMaturityLevel);

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Achieved PKI Maturity Level',
                data: userData,
                backgroundColor: background,
                borderColor: border,
                borderWidth: 1,
            },
        ],
    };

    const chartOptions = {
        scales: {
            r: {
                beginAtZero: true,
                min: 0,
                max: maxLevel,
                ticks: {
                    stepSize: 1,
                },
            },
        },
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 'bold', color: getComputedStyle(document.documentElement).getPropertyValue(`--pkimm-maturity-level-${overallMaturityLevel}`) }}>
                    {LevelResult[overallMaturityLevel]}
                </p>
            </div>
            <Radar data={chartData} options={chartOptions} />
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <p>This radar chart represents the maturity level of categories. The data is derived from user inputs and reflects the current status of the development.</p>
            </div>
        </div>
    );
};
