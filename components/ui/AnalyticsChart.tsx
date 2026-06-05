import React from 'react';
import { BarChart as CustomBarChart } from './Charts';

interface DataPoint {
    name: string;
    value: number;
}

interface AnalyticsChartProps {
    data: DataPoint[];
    color?: string;
    height?: number | string;
    title?: string;
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ data, color = "#0ea5e9", height = 220, title }) => {
    // Map Recharts-style data to our CustomBarChart format
    const mappedData = data.map(item => ({
        label: item.name,
        value: item.value
    }));

    return (
        <div style={{ width: '100%', minHeight: height || 220 }} className="p-2">
            <CustomBarChart title={title || ''} data={mappedData} />
        </div>
    );
};
