import React from 'react';

interface ChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  title: string;
  data: ChartData[];
}

export const BarChart: React.FC<BarChartProps> = ({ title, data }) => {
  const maxValue = Math.max(...data.map(d => d.value), 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">{title}</h3>
      <div className="space-y-2">
        {data.map(item => (
          <div key={item.label} className="grid grid-cols-4 items-center gap-2 text-sm">
            <div className="col-span-1 text-slate-600 dark:text-slate-400 truncate">{item.label}</div>
            <div className="col-span-3">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4">
                  <div 
                    className="bg-sky-500 h-4 rounded-full text-right"
                    style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                  >
                  </div>
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 w-10 text-left">{item.value.toFixed(1)}</span>
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-center text-slate-400 dark:text-slate-500 py-4">لا توجد بيانات للعرض.</p>}
      </div>
    </div>
  );
};

export interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  onItemClick?: (item: PieChartData) => void;
}

export const PieChart: React.FC<PieChartProps> = ({ data, onItemClick }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return <p className="text-center text-slate-400 dark:text-slate-500 py-4">لا توجد بيانات للعرض.</p>;
  }

  let cumulativePercentage = 0;
  const gradientParts = data.map(item => {
    const percentage = (item.value / total) * 100;
    const part = `${item.color} ${cumulativePercentage}% ${cumulativePercentage + percentage}%`;
    cumulativePercentage += percentage;
    return part;
  });
  const conicGradient = `conic-gradient(${gradientParts.join(', ')})`;

  return (
    <div className="flex items-center space-x-6 rtl:space-x-reverse">
      <div 
        className="w-36 h-36 rounded-full"
        style={{ background: conicGradient }}
        role="img"
        aria-label="Pie chart showing data distribution"
      ></div>
      <div className="text-sm space-y-2">
        {data.map(item => (
          <div 
            key={item.label} 
            onClick={() => onItemClick?.(item)}
            className={`flex items-center p-1 rounded-md transition-colors ${onItemClick ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700' : ''}`}
          >
            <span className="w-3 h-3 rounded-full mr-2 rtl:mr-0 rtl:ml-2" style={{ backgroundColor: item.color }}></span>
            <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
            <span className="text-slate-500 dark:text-slate-400 font-semibold mr-auto rtl:mr-0 rtl:ml-auto pl-2">
              {((item.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};


interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({ data, height = 200 }) => {
  if (data.length < 2) {
    return <p className="text-center text-slate-400 dark:text-slate-500 py-4">تحتاج إلى نقطتي بيانات على الأقل لرسم المخطط.</p>;
  }

  const width = 500; // Fixed width for simplicity
  const padding = 20;
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = 0; // Assuming we start from 0
  const axisLabelColor = 'rgb(100 116 139)'; // slate-500
  const darkAxisLabelColor = 'rgb(148 163 184)'; // slate-400

  const getX = (index: number) => padding + (index / (data.length - 1)) * (width - padding * 2);
  const getY = (value: number) => height - padding - ((value - minValue) / (maxValue - minValue)) * (height - padding * 2);

  const path = data.map((point, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(point.value)}`).join(' ');

  return (
     <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Line chart">
           <style>
            {`
              .axis-label { fill: ${axisLabelColor}; }
              .dark .axis-label { fill: ${darkAxisLabelColor}; }
            `}
           </style>
          {/* Y-axis labels */}
          <text x={padding - 5} y={padding} textAnchor="end" fontSize="10" className="axis-label">{maxValue.toFixed(0)}</text>
          <text x={padding - 5} y={height - padding} textAnchor="end" fontSize="10" className="axis-label">{minValue.toFixed(0)}</text>
          
          {/* X-axis labels */}
          <text x={padding} y={height - 5} textAnchor="start" fontSize="10" className="axis-label">{data[0].label}</text>
          <text x={width - padding} y={height - 5} textAnchor="end" fontSize="10" className="axis-label">{data[data.length - 1].label}</text>
          
          {/* The line */}
          <path d={path} fill="none" stroke="#0ea5e9" strokeWidth="2" />

          {/* Data points */}
          {data.map((point, i) => (
             <circle key={i} cx={getX(i)} cy={getY(point.value)} r="3" fill="#0ea5e9" />
          ))}
        </svg>
     </div>
  );
};