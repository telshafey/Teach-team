import React, { useMemo } from "react";
import { TeamMember, DailyLog } from "@shared/types";
import { Card } from "../ui/Card";
import { ClockIcon, BriefcaseIcon } from "../ui/Icons";
import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  format,
  getWeek,
  isSameMonth,
} from "date-fns";

interface WeeklyHoursTrackerProps {
  member: TeamMember;
  logs: DailyLog[];
  onStartChangeRequest: () => void;
}

const ProgressBar: React.FC<{ value: number; max: number }> = ({
  value,
  max,
}) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
      <div
        className="bg-sky-600 h-2.5 rounded-full"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

export const WeeklyHoursTracker: React.FC<WeeklyHoursTrackerProps> = ({
  member,
  logs,
  onStartChangeRequest,
}) => {
  const weeklyRequirement = member.weeklyHoursRequirement || 0;

  const monthData = useMemo(() => {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);

    const weeksInMonth = eachWeekOfInterval(
      { start: startOfCurrentMonth, end: endOfCurrentMonth },
      { weekStartsOn: 6 }, // Saturday
    ).filter((weekStart) => isSameMonth(weekStart, now)); // Ensure week starts within the month

    const weeklyBreakdown = weeksInMonth.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 6 });
      const weekNumber = getWeek(weekStart);

      const hoursLogged = logs
        .filter((log) =>
          isWithinInterval(new Date(log.date), {
            start: weekStart,
            end: weekEnd,
          }),
        )
        .reduce((sum, log) => sum + log.hours, 0);

      return {
        weekNumber,
        weekLabel: `الأسبوع ${weekNumber} (${format(weekStart, "d MMM")})`,
        hoursLogged,
        balance: hoursLogged - weeklyRequirement,
      };
    });

    const totalHoursLoggedThisMonth = weeklyBreakdown.reduce(
      (sum, week) => sum + week.hoursLogged,
      0,
    );
    const totalRequiredThisMonth = weeklyBreakdown.length * weeklyRequirement;
    const monthlyBalance = totalHoursLoggedThisMonth - totalRequiredThisMonth;

    return {
      weeklyBreakdown,
      totalHoursLoggedThisMonth,
      totalRequiredThisMonth,
      monthlyBalance,
    };
  }, [logs, weeklyRequirement]);

  const currentWeekData = useMemo(() => {
    const now = new Date();
    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 6 });
    const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 6 });

    const hoursLogged = logs
      .filter((log) =>
        isWithinInterval(new Date(log.date), {
          start: startOfCurrentWeek,
          end: endOfCurrentWeek,
        }),
      )
      .reduce((sum, log) => sum + log.hours, 0);

    return { hoursLogged };
  }, [logs]);

  if (!weeklyRequirement) {
    return (
      <Card>
        <div className="p-4 text-center text-slate-500">
          لم يتم تحديد ساعات العمل الأسبوعية المطلوبة لهذا المستخدم.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card
        title="متابعة ساعات العمل الأسبوعية"
        icon={<ClockIcon className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1 text-sm font-medium">
              <span className="text-slate-700 dark:text-slate-300">
                تقدم هذا الأسبوع
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {currentWeekData.hoursLogged.toFixed(1)} / {weeklyRequirement}{" "}
                ساعة
              </span>
            </div>
            <ProgressBar
              value={currentWeekData.hoursLogged}
              max={weeklyRequirement}
            />
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              الرصيد المرحل من الأسابيع الماضية (هذا الشهر)
            </span>
            <span
              className={`font-bold text-lg ${monthData.monthlyBalance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {monthData.monthlyBalance.toFixed(1)} ساعة
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            الرصيد المرحل يمثل الفرق بين إجمالي الساعات المسجلة هذا الشهر
            وإجمالي الساعات المطلوبة حتى الآن. يتم تصفير هذا الرصيد في نهاية كل
            شهر.
          </p>
          <button
            onClick={onStartChangeRequest}
            className="w-full mt-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            طلب تعديل ساعات العمل والراتب
          </button>
        </div>
      </Card>

      <Card
        title="تفصيل ساعات العمل للشهر الحالي"
        icon={<BriefcaseIcon className="w-5 h-5" />}
      >
        <div className="space-y-3">
          {monthData.weeklyBreakdown.map((week) => (
            <div
              key={week.weekNumber}
              className="flex justify-between items-center p-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0"
            >
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {week.weekLabel}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  المطلوب: {weeklyRequirement} ساعة
                </p>
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  {week.hoursLogged.toFixed(1)} ساعة
                </p>
                <p
                  className={`text-xs font-semibold ${week.balance >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {week.balance >= 0
                    ? `+${week.balance.toFixed(1)}`
                    : week.balance.toFixed(1)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="p-4 text-sm text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-amber-900/30 rounded-md">
          <p className="font-semibold text-amber-800 dark:text-amber-200">
            ملاحظة هامة:
          </p>
          <p>
            قد يتأثر الراتب الشهري بناءً على إجمالي ساعات العمل المسجلة. القرار
            النهائي يخضع لموافقة المدير المباشر.
          </p>
        </div>
      </Card>
    </div>
  );
};
