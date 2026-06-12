import React from "react";
import { Card } from "../ui/Card";
import {
  ClockIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "../ui/Icons";

interface PerformanceSummaryCardProps {
  currentMonthHours: number;
  lastMonthHours: number;
  currentMonthTasks: number;
  lastMonthTasks: number;
}

const StatItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  currentValue: number;
  previousValue: number;
  unit: string;
}> = ({ icon, label, currentValue, previousValue, unit }) => {
  const percentageChange =
    previousValue > 0
      ? ((currentValue - previousValue) / previousValue) * 100
      : currentValue > 0
        ? 100
        : 0;

  const isPositive = percentageChange >= 0;

  return (
    <div className="flex items-start space-x-4 rtl:space-x-reverse">
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-sky-100 dark:bg-sky-900/50 rounded-lg text-sky-600 dark:text-sky-400">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {currentValue.toFixed(unit === "h" ? 1 : 0)}{" "}
          <span className="text-lg font-medium">{unit}</span>
        </p>
        <div
          className={`flex items-center text-xs font-semibold mt-1 ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
        >
          {isPositive ? (
            <ArrowUpIcon className="w-4 h-4" />
          ) : (
            <ArrowDownIcon className="w-4 h-4" />
          )}
          <span>{Math.abs(percentageChange).toFixed(0)}%</span>
          <span className="text-slate-400 font-normal mr-1 rtl:mr-0 rtl:ml-1">
            عن الشهر الماضي
          </span>
        </div>
      </div>
    </div>
  );
};

export const PerformanceSummaryCard: React.FC<PerformanceSummaryCardProps> = ({
  currentMonthHours,
  lastMonthHours,
  currentMonthTasks,
  lastMonthTasks,
}) => {
  return (
    <Card title="ملخص الأداء الشهري">
      <div className="space-y-6">
        <StatItem
          icon={<ClockIcon className="w-6 h-6" />}
          label="الساعات المسجلة هذا الشهر"
          currentValue={currentMonthHours}
          previousValue={lastMonthHours}
          unit="ساعة"
        />
        <StatItem
          icon={<CheckCircleIcon className="w-6 h-6" />}
          label="المهام المكتملة هذا الشهر"
          currentValue={currentMonthTasks}
          previousValue={lastMonthTasks}
          unit="مهمة"
        />
      </div>
    </Card>
  );
};
