import React, { useState, useMemo } from "react";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { useTimeLogContext } from "@shared/contexts/TimeLogContext";
import { format, isToday, isThisWeek, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAll } from "@shared/services/apiService";
import { useSupabase } from "@shared/contexts/SupabaseContext";
import { useAuth } from "@shared/contexts/AuthContext";
import { Project, Task, TaskComment, TaskAttachment } from "@shared/types";
import { useNavigation } from "@shared/contexts/NavigationContext";

type FilterPeriod = "today" | "week" | "all" | "custom";

interface CompiledActivity {
  id: string;
  type: "time_log" | "task_created" | "project_created" | "comment_added" | "attachment_uploaded";
  date: string; // ISO string
  teamMemberId: number;
  projectId?: string;
  taskId?: string;
  hours?: number;
  description: string;
  meta?: any;
}

export const WorkSummaryPage: React.FC = () => {
  const { onNavigate } = useNavigation();
  const { teamMembers, hasPermission } = useTeamContext();
  const { dailyLogs } = useTimeLogContext();
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateDemoData = async () => {
    if (!supabaseClient || !currentUser) return;
    setIsGenerating(true);
    try {
      // 1. Create a demo project
      const { data: projectData, error: projErr } = await supabaseClient
        .from("projects")
        .insert({
          name: "مشروع تطوير منصة لوحة التحكم للموظفين v2",
          description: "تصميم وتطوير النسخة الثانية من لوحة التحكم المتكاملة لإدارة المشاريع والمهام والأنشطة.",
          status: "نشط",
          creator_id: currentUser.id,
          members: [{ team_member_id: currentUser.id, project_role: "Manager" }],
        })
        .select()
        .single();

      if (projErr) throw projErr;

      // 2. Create a task linked to that project
      const { data: taskData, error: taskErr } = await supabaseClient
        .from("tasks")
        .insert({
          title: "تصميم واجهات تجربة المستخدم والأنشطة الكاملة UI/UX",
          description: "تصميم الواجهات المتقدمة لسجلات الأنشطة ومتابعة ملخص العمل والتقارير المرفقة.",
          project_id: projectData.id,
          creator_id: currentUser.id,
          assigned_to: currentUser.id,
          status: "inprogress",
          approval_status: "approved",
        })
        .select()
        .single();

      if (taskErr) throw taskErr;

      // 3. Create a daily log / timesheet entry
      const { error: logErr } = await supabaseClient
        .from("daily_logs")
        .insert({
          team_member_id: currentUser.id,
          project_id: projectData.id,
          task_id: taskData.id,
          date: new Date().toISOString().split("T")[0],
          hours: 5.5,
          description: "تصميم واجهات المستخدم وتجربة المستخدم وعمل الربط التلقائي والكامل مع قاعدة البيانات لعرض كافة الأنشطة.",
        });

      if (logErr) throw logErr;

      // 4. Create a task comment
      const { error: commentErr } = await supabaseClient
        .from("task_comments")
        .insert({
          task_id: taskData.id,
          author_id: currentUser.id,
          text: "الواجهات جاهزة للمراجعة والتقييم النهائي، وتم تفعيل نظام تغذية الأنشطة الشامل بنجاح.",
          timestamp: new Date().toISOString(),
        });

      if (commentErr) throw commentErr;

      // 5. Create a task attachment
      const { error: attachErr } = await supabaseClient
        .from("task_attachments")
        .insert({
          task_id: taskData.id,
          uploader_id: currentUser.id,
          file_name: "dashboard_wireframes_v2.png",
          file_url: "#",
          timestamp: new Date().toISOString(),
        });

      if (attachErr) throw attachErr;

      // Invalidate queries to reload all fresh data
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["task_comments"] });
      await queryClient.invalidateQueries({ queryKey: ["task_attachments"] });
      await queryClient.invalidateQueries({ queryKey: ["dailyLogs"] });

    } catch (err: any) {
      console.error("Error generating seed data:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Queries for other activities using shared apiService (by-passing RLS via custom secure proxy)
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => getAll<Project>(supabaseClient!, "projects"),
    enabled: !!supabaseClient,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => getAll<Task>(supabaseClient!, "tasks"),
    enabled: !!supabaseClient,
  });

  const { data: comments = [] } = useQuery<TaskComment[]>({
    queryKey: ["task_comments"],
    queryFn: () => getAll<TaskComment>(supabaseClient!, "task_comments"),
    enabled: !!supabaseClient,
  });

  const { data: attachments = [] } = useQuery<TaskAttachment[]>({
    queryKey: ["task_attachments"],
    queryFn: () => getAll<TaskAttachment>(supabaseClient!, "task_attachments"),
    enabled: !!supabaseClient,
  });

  // Filters State
  const [period, setPeriod] = useState<FilterPeriod>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Determine if the current user has manager privileges to filter by team members
  const isManager = useMemo(() => {
    return (
      hasPermission("manage_team") ||
      hasPermission("edit_team_members") ||
      hasPermission("view_reports") ||
      hasPermission("view_analytics")
    );
  }, [hasPermission]);

  // Aggregate all activities dynamically
  const allActivities = useMemo(() => {
    const list: CompiledActivity[] = [];

    // 1. Time logs / Daily logs
    (dailyLogs || []).forEach((log) => {
      list.push({
        id: log.id,
        type: "time_log",
        date: log.createdAt || `${log.date}T12:00:00.000Z`,
        teamMemberId: log.teamMemberId,
        projectId: log.projectId,
        taskId: log.taskId,
        hours: log.hours,
        description: log.description || "سجل ساعات العمل",
      });
    });

    // 2. Tasks created
    (tasks || []).forEach((task) => {
      // Find creation timestamp, fallback to current or dynamic
      const taskDate = (task as any).createdAt || (task as any).timestamp || new Date().toISOString();
      list.push({
        id: task.id,
        type: "task_created",
        date: taskDate,
        teamMemberId: task.creatorId,
        projectId: task.projectId,
        taskId: task.id,
        description: `أنشأ مهمة جديدة: "${task.title}"`,
        meta: {
          title: task.title,
          status: task.status,
          approvalStatus: task.approvalStatus,
        },
      });
    });

    // 3. Projects created
    (projects || []).forEach((proj) => {
      const projDate = (proj as any).createdAt || new Date().toISOString();
      list.push({
        id: proj.id,
        type: "project_created",
        date: projDate,
        teamMemberId: proj.creatorId,
        projectId: proj.id,
        description: `أنشأ مشروعاً جديداً: "${proj.name}"`,
        meta: {
          name: proj.name,
          status: proj.status,
          description: proj.description,
        },
      });
    });

    // 4. Comments added
    (comments || []).forEach((comment) => {
      const task = (tasks || []).find((t) => t.id === comment.taskId);
      list.push({
        id: comment.id,
        type: "comment_added",
        date: comment.timestamp || new Date().toISOString(),
        teamMemberId: comment.authorId,
        projectId: task?.projectId,
        taskId: comment.taskId,
        description: `أضاف تعليقاً على مهمة: "${comment.text}"`,
        meta: {
          text: comment.text,
          taskTitle: task?.title || "مهمة غير معروفة",
        },
      });
    });

    // 5. Attachments uploaded
    (attachments || []).forEach((attach) => {
      const task = (tasks || []).find((t) => t.id === attach.taskId);
      list.push({
        id: attach.id,
        type: "attachment_uploaded",
        date: attach.timestamp || new Date().toISOString(),
        teamMemberId: attach.uploaderId,
        projectId: task?.projectId,
        taskId: attach.taskId,
        description: `رفع ملفاً مرفقاً: "${attach.fileName}"`,
        meta: {
          fileName: attach.fileName,
          fileUrl: attach.fileUrl,
          taskTitle: task?.title || "مهمة غير معروفة",
        },
      });
    });

    return list;
  }, [dailyLogs, tasks, projects, comments, attachments]);

  // Apply filters & search to compiled activities
  const filteredActivities = useMemo(() => {
    return allActivities
      .filter((act) => {
        // Filter by activity type
        if (selectedType !== "all" && act.type !== selectedType) return false;

        // Filter by project
        if (selectedProjectId !== "all" && act.projectId !== selectedProjectId) return false;

        // Filter by member
        if (selectedMemberId !== "all") {
          if (String(act.teamMemberId) !== String(selectedMemberId)) return false;
        } else if (!isManager && currentUser) {
          // If not manager, standard user should only see their own activities or those in their allowed projects
          // (Backend filters the source lists, but this client-side check keeps it tightly scoped)
        }

        // Filter by Search text
        if (searchQuery.trim() !== "") {
          const query = searchQuery.toLowerCase();
          const matchesText = act.description.toLowerCase().includes(query);
          const taskObj = (tasks || []).find((t) => t.id === act.taskId);
          const projectObj = (projects || []).find((p) => p.id === act.projectId);
          const matchesTask = taskObj?.title.toLowerCase().includes(query);
          const matchesProj = projectObj?.name.toLowerCase().includes(query);
          if (!matchesText && !matchesTask && !matchesProj) return false;
        }

        // Filter by Date Period
        try {
          const actDate = parseISO(act.date);
          if (period === "today") {
            return isToday(actDate);
          } else if (period === "week") {
            return isThisWeek(actDate, { weekStartsOn: 6 });
          } else if (period === "custom") {
            if (!startDate || !endDate) return true;
            return isWithinInterval(actDate, {
              start: startOfDay(parseISO(startDate)),
              end: endOfDay(parseISO(endDate)),
            });
          }
          return true;
        } catch (err) {
          return false;
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    allActivities,
    selectedType,
    selectedProjectId,
    selectedMemberId,
    period,
    startDate,
    endDate,
    searchQuery,
    isManager,
    currentUser,
    tasks,
    projects,
  ]);

  // Compute metrics for the filtered activities
  const metrics = useMemo(() => {
    const logs = filteredActivities.filter((a) => a.type === "time_log");
    const tCount = filteredActivities.filter((a) => a.type === "task_created").length;
    const pCount = filteredActivities.filter((a) => a.type === "project_created").length;
    const cCount = filteredActivities.filter((a) => a.type === "comment_added").length;
    const aCount = filteredActivities.filter((a) => a.type === "attachment_uploaded").length;

    const totalHours = logs.reduce((sum, log) => sum + (log.hours || 0), 0);

    return {
      totalHours,
      totalActivities: filteredActivities.length,
      tasksCount: tCount,
      projectsCount: pCount,
      commentsCount: cCount,
      attachmentsCount: aCount,
    };
  }, [filteredActivities]);

  // Format activity date for Arabic locale
  const formatActivityDate = (isoString: string) => {
    try {
      const date = parseISO(isoString);
      return format(date, "dd MMMM yyyy - hh:mm a", { locale: ar });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-900/40 min-h-full pb-12">
      {/* Header */}
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
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">ملخص العمل وسجل الأنشطة الكامل</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              متابعة وجدولة شاملة لكافة الأنشطة من مهام ومشاريع وسجلات ساعات عمل وتعليقات وملفات مرفوعة.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center gap-3">
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-lg">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">إجمالي الأنشطة المنجزة</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{metrics.totalActivities}</p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">ساعات العمل المسجلة</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{metrics.totalHours.toFixed(1)} <span className="text-xs font-normal">ساعة</span></p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">مهام ومشاريع مضافة</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{metrics.tasksCount + metrics.projectsCount}</p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">تعليقات وملفات مرفقة</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{metrics.commentsCount + metrics.attachmentsCount}</p>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="p-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-4 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Quick Type Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedType("all")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                selectedType === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              الكل الأنشطة
            </button>
            <button
              onClick={() => setSelectedType("time_log")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                selectedType === "time_log"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              سجلات الأوقات ({metrics.totalHours.toFixed(0)} س)
            </button>
            <button
              onClick={() => setSelectedType("task_created")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                selectedType === "task_created"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              المهام المضافة ({metrics.tasksCount})
            </button>
            <button
              onClick={() => setSelectedType("project_created")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                selectedType === "project_created"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              المشاريع ({metrics.projectsCount})
            </button>
            <button
              onClick={() => setSelectedType("comment_added")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                selectedType === "comment_added"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              التعليقات ({metrics.commentsCount})
            </button>
            <button
              onClick={() => setSelectedType("attachment_uploaded")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                selectedType === "attachment_uploaded"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              الملفات ({metrics.attachmentsCount})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="ابحث في الأنشطة والمهام..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700/50">
          {/* Period Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">الفترة الزمنية</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as FilterPeriod)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">كل الأوقات</option>
              <option value="today">اليوم</option>
              <option value="week">هذا الأسبوع</option>
              <option value="custom">فترة مخصصة</option>
            </select>
          </div>

          {/* Custom Date Range Picker */}
          {period === "custom" && (
            <div className="flex flex-col gap-1.5 sm:col-span-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">تحديد التاريخ</label>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-1/2 px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <span className="text-slate-400 text-xs">إلى</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-1/2 px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          {/* Project Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">المشروع</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">جميع المشاريع</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Member Filter (Visible to managers, or simplified for employees) */}
          {isManager ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">عضو الفريق</label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">جميع الأعضاء</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">عضو الفريق</label>
              <select
                disabled
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-400 focus:outline-none cursor-not-allowed"
              >
                <option>{currentUser?.name || "حسابي الخاص"}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Timeline Feed */}
      <div className="p-6">
        {filteredActivities.length > 0 ? (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="relative border-r border-slate-200 dark:border-slate-700/80 pr-6 space-y-6">
              {filteredActivities.map((act) => {
                const member = (teamMembers || []).find((m) => m.id === act.teamMemberId);
                const projectObj = (projects || []).find((p) => p.id === act.projectId);
                const taskObj = (tasks || []).find((t) => t.id === act.taskId);

                // Decide color and icon for each type
                let typeStyles = {
                  bgColor: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
                  borderColor: "border-slate-200 dark:border-slate-700",
                  badgeName: "نشاط مجهول",
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  ),
                };

                if (act.type === "time_log") {
                  typeStyles = {
                    bgColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/30",
                    borderColor: "border-amber-100 dark:border-amber-900/20",
                    badgeName: "ساعات العمل",
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                  };
                } else if (act.type === "task_created") {
                  typeStyles = {
                    bgColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30",
                    borderColor: "border-emerald-100 dark:border-emerald-900/20",
                    badgeName: "إضافة مهمة",
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    ),
                  };
                } else if (act.type === "project_created") {
                  typeStyles = {
                    bgColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/30",
                    borderColor: "border-sky-100 dark:border-sky-900/20",
                    badgeName: "إضافة مشروع",
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    ),
                  };
                } else if (act.type === "comment_added") {
                  typeStyles = {
                    bgColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30",
                    borderColor: "border-indigo-100 dark:border-indigo-900/20",
                    badgeName: "تعليق جديد",
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    ),
                  };
                } else if (act.type === "attachment_uploaded") {
                  typeStyles = {
                    bgColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/30",
                    borderColor: "border-purple-100 dark:border-purple-900/20",
                    badgeName: "رفع ملف",
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    ),
                  };
                }

                return (
                  <div key={act.id} className="relative group">
                    {/* Circle Indicator on vertical line */}
                    <div className="absolute right-0 top-6 -mr-[32px] w-5 h-5 rounded-full border-4 border-slate-50 dark:border-slate-900 bg-white dark:bg-slate-800 flex items-center justify-center z-10 transition-all duration-300 group-hover:scale-110">
                      <div className={`w-2.5 h-2.5 rounded-full ${act.type === "time_log" ? "bg-amber-500" : act.type === "task_created" ? "bg-emerald-500" : act.type === "project_created" ? "bg-sky-500" : act.type === "comment_added" ? "bg-indigo-500" : "bg-purple-500"}`} />
                    </div>

                    {/* Main Card */}
                    <div className={`bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all duration-200`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                        {/* Member avatar and info */}
                        <div className="flex items-center gap-3">
                          {member?.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-300">
                              {member?.name?.charAt(0) || "U"}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                              {member?.name || "عضو مجهول"}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                {formatActivityDate(act.date)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Activity Type Badge */}
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${typeStyles.bgColor}`}>
                            {typeStyles.icon}
                            {typeStyles.badgeName}
                          </span>

                          {/* Time logs show hour duration badge */}
                          {act.type === "time_log" && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                              ⏱️ {act.hours} ساعة عمل
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Content body */}
                      <div className="mt-4 text-slate-700 dark:text-slate-200 text-sm leading-relaxed text-right">
                        {act.type === "time_log" && (
                          <div className="space-y-2">
                            <p className="font-medium text-slate-800 dark:text-slate-100">
                              {act.description}
                            </p>
                          </div>
                        )}

                        {act.type === "task_created" && (
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {act.meta?.title}
                            </p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                              حالة المهمة: {act.meta?.status === "done" ? "مكتملة" : act.meta?.status === "inprogress" ? "جاري العمل" : "بانتظار البدء"}
                            </span>
                          </div>
                        )}

                        {act.type === "project_created" && (
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {act.meta?.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {act.meta?.description || "لا يوجد وصف للمشروع"}
                            </p>
                          </div>
                        )}

                        {act.type === "comment_added" && (
                          <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-700/40">
                            <p className="text-slate-700 dark:text-slate-300 italic font-medium">
                              "{act.meta?.text}"
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                              على المهمة: <span className="font-bold text-slate-500 dark:text-slate-400">{act.meta?.taskTitle}</span>
                            </p>
                          </div>
                        )}

                        {act.type === "attachment_uploaded" && (
                          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-700/40">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                  {act.meta?.fileName}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                  على المهمة: <span className="font-semibold text-slate-500">{act.meta?.taskTitle}</span>
                                </p>
                              </div>
                            </div>
                            {act.meta?.fileUrl && (
                              <a
                                href={act.meta.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded-md text-[10px] font-bold transition-all"
                              >
                                تحميل الملف
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer: Related Project/Task badging */}
                      {(projectObj || taskObj) && (
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap gap-2">
                          {projectObj && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-[10px] text-sky-800 dark:text-sky-300 border border-sky-100 dark:border-sky-900/40">
                              📁 المشروع: {projectObj.name}
                            </span>
                          )}
                          {taskObj && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[10px] text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40">
                              📋 المهمة: {taskObj.title}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[350px] text-slate-500 max-w-md mx-auto text-center py-12 space-y-4">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">لم يتم العثور على أي أنشطة</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              لا توجد أنشطة أو سجلات عمل تطابق الفلاتر المحددة لهذه الفترة. حاول تغيير خيارات التصفية أو وسّع النطاق الزمني.
            </p>
            <div className="bg-sky-50 dark:bg-sky-950/40 p-4 rounded-lg border border-sky-100 dark:border-sky-900/60 text-xs text-sky-800 dark:text-sky-300 text-right space-y-1">
              <p className="font-semibold">💡 هل ترغب بتسجيل عمل جديد؟</p>
              <p>يمكنك دائمًا الذهاب إلى صفحة "أوقاتي" لإدخال ساعات العمل الفعلية على المهام المسندة إليك ومتابعة السجل أولاً بأول.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center pt-2">
              <button
                onClick={() => onNavigate("timesheet")}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                الذهاب إلى "أوقاتي" لتسجيل ساعات العمل
              </button>
              <button
                onClick={handleGenerateDemoData}
                disabled={isGenerating}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    جاري التوليد...
                  </>
                ) : (
                  "توليد بيانات تجريبية في قاعدة البيانات 🚀"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
