import React, { useState, useMemo } from "react";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { useTimeLogContext } from "@shared/contexts/TimeLogContext";
import { format, isToday, isThisWeek, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { getAll } from "@shared/services/apiService";
import { useSupabase } from "@shared/contexts/SupabaseContext";
import { Project } from "@shared/types";

import { useNavigation } from "@shared/contexts/NavigationContext";

type FilterPeriod = "today" | "week" | "all" | "custom";

export const WorkSummaryPage: React.FC = () => {
  const { onNavigate } = useNavigation();
  const { teamMembers } = useTeamContext();
  const { dailyLogs } = useTimeLogContext();
  const { supabaseClient } = useSupabase();

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => getAll(supabaseClient!, "projects"),
    enabled: !!supabaseClient,
  });

  const [period, setPeriod] = useState<FilterPeriod>("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredLogs = useMemo(() => {
    return (dailyLogs || []).filter((log) => {
      try {
        const logDate = parseISO(log.date);
        if (period === "today") {
          return isToday(logDate);
        } else if (period === "week") {
          return isThisWeek(logDate, { weekStartsOn: 6 });
        } else if (period === "custom") {
          if (!startDate || !endDate) return true;
          return isWithinInterval(logDate, {
            start: startOfDay(parseISO(startDate)),
            end: endOfDay(parseISO(endDate)),
          });
        }
        return true;
      } catch (err) {
        return false;
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dailyLogs, period, startDate, endDate]);

  const totalHours = filteredLogs.reduce((sum, log) => sum + log.hours, 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50">
      <div className="flex items-center justify-between p-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate("dashboard")}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <svg
              className="w-5 h-5 rtl:rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">ملخص العمل والأنشطة</h1>
        </div>
      </div>
        
      {/* Filters */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-wrap gap-4 items-center justify-between shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              الفترة الزمنية:
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as FilterPeriod)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="today">اليوم</option>
              <option value="week">هذا الأسبوع</option>
              <option value="all">كل الأوقات</option>
              <option value="custom">فترة مخصصة</option>
            </select>

            {period === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <span className="text-slate-500">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 bg-sky-50 dark:bg-sky-900/30 px-3 py-2 rounded-lg border border-sky-100 dark:border-sky-800 text-sky-800 dark:text-sky-200">
            <span className="text-sm font-semibold">إجمالي الساعات المسجلة:</span>
            <span className="text-lg font-bold">{totalHours.toFixed(1)}</span>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-auto p-4">
          {filteredLogs.length > 0 ? (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
              <table className="w-full text-sm text-right">
                <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-right">التاريخ</th>
                    <th className="px-4 py-3 font-semibold text-right">المستخدم</th>
                    <th className="px-4 py-3 font-semibold text-right w-1/3">طبيعة العمل (الوصف)</th>
                    <th className="px-4 py-3 font-semibold text-right">المشروع</th>
                    <th className="px-4 py-3 font-semibold text-center">الوقت المستغرق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredLogs.map((log) => {
                    const member = (teamMembers || []).find(m => m.id === log.teamMemberId);
                    const project = (projects || []).find(p => p.id === log.projectId);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 w-full dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {format(parseISO(log.date), "dd MMM yyyy", { locale: ar })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {member?.avatarUrl ? (
                              <img src={member.avatarUrl} alt={member.name} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900 flex items-center justify-center text-xs font-bold text-sky-700 dark:text-sky-300">
                                {member?.name?.charAt(0) || "U"}
                              </div>
                            )}
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {member?.name || "مستخدم مجهول"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 break-words w-1/3">
                          {log.description || <span className="text-slate-400 italic">بدون وصف</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {project ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700">
                              {project.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center font-bold text-slate-800 dark:text-slate-200">
                          {log.hours} <span className="text-xs font-normal text-slate-500">ساعة</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <svg className="w-12 h-12 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>لا توجد أنشطة أو سجلات عمل لهذه الفترة.</p>
            </div>
          )}
        </div>
      </div>
  );
};
