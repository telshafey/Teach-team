import React, { useMemo, useState, useCallback } from "react";
import { useAuth } from "@shared/contexts/AuthContext";
import { useTimeLogContext } from "@shared/contexts/TimeLogContext";
import { useSettingsContext } from "@shared/contexts/SettingsContext";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { Card } from "../ui/Card";
import { Calendar } from "../ui/Calendar";
import {
  DailyLog,
  DailyLogFormData,
  Task,
  Meeting,
  Project,
} from "@shared/types";
import {
  format,
  isSameDay,
  isFuture,
  differenceInCalendarDays,
  parseISO,
  isThisWeek,
} from "date-fns";
import { arSA } from "date-fns/locale";
import { DailyLogDetailModal } from "../modals/DailyLogDetailModal";
import { LogFormModal } from "../modals/LogFormModal";
import { TaskDetailInline } from "../tasks/TaskDetailInline";
import { EmptyState } from "../ui/EmptyState";
import {
  FolderIcon,
  PlusIcon,
  ClockIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  BellIcon,
} from "../ui/Icons";
import { useNavigation } from "@shared/contexts/NavigationContext";
import { UpcomingMeetingsCard } from "./UpcomingMeetingsCard";
import { useTimeManagement } from "@shared/contexts/TimeManagementContext";
import { TaskCardSkeleton } from "../project/TaskCardSkeleton";
import { StatCard } from "./StatCard";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@shared/contexts/SupabaseContext";
import * as api from "@shared/services/apiService";
import { AnalyticsChart } from "../ui/AnalyticsChart";

// Widget Components
const PunchClockWidget: React.FC = () => {
  const { activePunchIn, handlePunchIn } = useTimeManagement();
  const isCheckedIn = !!activePunchIn;

  return (
    <Card
      title="تسجيل الحضور والانصراف"
      icon={<ClockIcon className="w-5 h-5" />}
    >
      <div className="text-center p-4 flex flex-col justify-center h-full">
        {isCheckedIn ? (
          <div>
            <p className="font-semibold text-green-600 dark:text-green-400">
              أنت مسجل حضورك حاليًا.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              بدأ في:{" "}
              {format(new Date(activePunchIn.startTime), "p", { locale: arSA })}
            </p>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-slate-600 dark:text-slate-300 mb-4">
              أنت غير مسجل حضورك حاليًا.
            </p>
            <button
              onClick={handlePunchIn}
              className="w-full px-4 py-3 text-lg font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-transform transform hover:scale-105"
            >
              تسجيل الحضور
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};

const MyTasksWidget: React.FC<{
  tasks: Task[];
  projects: Project[];
  onTaskClick: (task: Task) => void;
  onNavigate: (view: any, props?: any) => void;
  isLoading: boolean;
}> = ({ tasks, projects, onTaskClick, onNavigate, isLoading }) => (
  <Card
    title="المهام المفتوحة"
    headerActions={
      <button
        onClick={() => onNavigate("myTasks")}
        className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline"
      >
        عرض الكل
      </button>
    }
  >
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {isLoading ? (
        <div className="space-y-3 pr-1 overflow-y-auto">
          <TaskCardSkeleton />
          <TaskCardSkeleton />
          <TaskCardSkeleton />
        </div>
      ) : tasks.length > 0 ? (
        <div className="space-y-3 pr-1 pb-2 overflow-y-auto">
          {tasks.slice(0, 50).map((task) => (
            <div
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:border-sky-100 dark:hover:border-sky-800 transition-all"
            >
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">
                {task.title}
              </p>
              <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <FolderIcon className="w-3 h-3" />{" "}
                  {task.projectId
                    ? projects.find((p) => p.id === task.projectId)?.name
                    : "مهمة خاصة"}
                </span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />{" "}
                  {task.dueDate
                    ? format(parseISO(task.dueDate), "d MMM", { locale: arSA })
                    : "بدون تاريخ"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderIcon className="w-8 h-8" />}
          title="لا توجد مهام"
          message="لا توجد لديك مهام مفتوحة حاليًا."
        />
      )}
    </div>
  </Card>
);

const MeetingsWidget: React.FC<{
  meetings: Meeting[];
  onJoin: (m: Meeting) => void;
}> = ({ meetings, onJoin }) => (
  <UpcomingMeetingsCard
    title="اجتماعاتي القادمة"
    meetings={meetings}
    onJoinMeeting={onJoin}
  />
);

const CalendarWidget: React.FC<{
  events: any[];
  onDateClick: (date: Date) => void;
  highlightedDate: Date | null;
}> = ({ events, onDateClick, highlightedDate }) => (
  <Card title="تقويمي">
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <Calendar
        events={events}
        onDateClick={onDateClick}
        highlightedDate={highlightedDate}
      />
    </div>
  </Card>
);

const WeeklyActivityWidget: React.FC<{ logs: DailyLog[] }> = ({ logs }) => {
  const data = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - i));
      return date;
    });

    return days.map((day) => {
      const dayLogs = logs.filter((log) =>
        typeof log.date === "string"
          ? log.date.startsWith(format(day, "yyyy-MM-dd"))
          : isSameDay(new Date(log.date), day),
      );
      const hours = dayLogs.reduce(
        (sum, log) => sum + (log.hours || 0),
        0,
      );
      return {
        name: format(day, "EEEE", { locale: arSA }).split(" ")[0],
        value: Number(hours.toFixed(1)),
      };
    });
  }, [logs]);

  return (
    <Card title="نشاط الأسبوع">
      <div className="h-full w-full relative min-h-[200px]">
        <AnalyticsChart data={data} color="#0ea5e9" />
      </div>
    </Card>
  );
};

export const PersonalDashboard: React.FC = () => {
  const { onNavigate } = useNavigation();
  const { currentUser } = useAuth();
  const {
    dailyLogs,
    handleAddDailyLog,
    handleUpdateDailyLog,
    handleDeleteDailyLog,
  } = useTimeLogContext();
  const { siteSettings } = useSettingsContext();
  const { supabaseClient } = useSupabase();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [isLogFormOpen, setIsLogFormOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  const isEmployee =
    currentUser?.employmentType === "full-time" ||
    currentUser?.employmentType === "part-time";

  const { hasPermission, roles } = useTeamContext();
  const currentUserRole = roles?.find((r) => r.id === currentUser?.roleId);
  const isGM =
    currentUser?.roleId === "gm" ||
    currentUser?.roleId === "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" ||
    currentUserRole?.name.includes("(GM)");

  const { data: meetings = [] } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => api.getAll<Meeting>(supabaseClient!, "meetings"),
    enabled: !!supabaseClient,
  });
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => api.getAll(supabaseClient!, "projects"),
    enabled: !!supabaseClient,
  });
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => api.getAll(supabaseClient!, "tasks"),
    enabled: !!supabaseClient,
  });

  const myLogs = useMemo(
    () => dailyLogs.filter((log) => log.teamMemberId === currentUser?.id),
    [dailyLogs, currentUser],
  );

  const myTasks = useMemo(() => {
    if (!currentUser) return [];
    return tasks.filter((task) => {
      if (isGM) return true;

      if (task.projectId) {
        const project = projects.find((p) => p.id === task.projectId);
        if (project) {
          const isMember = project.members?.some(
            (m) => m.teamMemberId === currentUser.id,
          );
          if (!isMember) return false;
        } else {
          return false;
        }
      } else {
        if (
          task.assignedTo !== currentUser.id &&
          task.creatorId !== currentUser.id
        )
          return false;
      }

      return (
        task.assignedTo === currentUser.id || task.creatorId === currentUser.id
      );
    });
  }, [tasks, projects, currentUser, isGM]);

  const myOpenTasks = useMemo(
    () => myTasks.filter((task) => task.status !== "done"),
    [myTasks],
  );

  const isDateEditableForLogging = useCallback(
    (date: Date): boolean => {
      if (isFuture(date)) return false;
      const limit = siteSettings?.logEditingDaysLimit ?? 3;
      return differenceInCalendarDays(new Date(), date) <= limit;
    },
    [siteSettings],
  );

  const { todayHours, thisWeekHours, dueSoonCount } = useMemo(() => {
    const now = new Date();
    return {
      todayHours: myLogs
        .filter((l) => isSameDay(new Date(l.date), now))
        .reduce((sum, l) => sum + l.hours, 0),
      thisWeekHours: myLogs
        .filter((l) => isThisWeek(new Date(l.date), { weekStartsOn: 0 }))
        .reduce((sum, l) => sum + l.hours, 0),
      dueSoonCount: myOpenTasks.filter(
        (t) =>
          t.dueDate &&
          differenceInCalendarDays(parseISO(t.dueDate), now) >= 0 &&
          differenceInCalendarDays(parseISO(t.dueDate), now) <= 3,
      ).length,
    };
  }, [myLogs, myOpenTasks]);

  const myMeetings = useMemo(
    () => meetings.filter((m) => m.members?.includes(currentUser!.id)),
    [meetings, currentUser],
  );

  const calendarEvents = useMemo(() => {
    const events: {
      date: Date;
      hasLog?: boolean;
      isDueDate?: boolean;
      isMeeting?: boolean;
    }[] = [];
    const dateMap: {
      [key: string]: {
        hasLog?: boolean;
        isDueDate?: boolean;
        isMeeting?: boolean;
      };
    } = {};
    myLogs.forEach((log) => {
      (dateMap[format(new Date(log.date), "yyyy-MM-dd")] ||= {}).hasLog = true;
    });
    myTasks.forEach((task) => {
      if (task.dueDate)
        (dateMap[format(new Date(task.dueDate), "yyyy-MM-dd")] ||=
          {}).isDueDate = true;
    });
    myMeetings.forEach((meeting) => {
      if (meeting.startTime)
        (dateMap[format(new Date(meeting.startTime), "yyyy-MM-dd")] ||=
          {}).isMeeting = true;
    });
    for (const dateStr in dateMap)
      events.push({ date: new Date(dateStr), ...dateMap[dateStr] });
    return events;
  }, [myLogs, myTasks, myMeetings]);

  const handleDateClick = (date: Date) =>
    setSelectedDate(format(date, "yyyy-MM-dd"));
  const handleSaveLog = async (logData: DailyLogFormData) => {
    if (!currentUser) return;
    const dateToSave =
      editingLog?.date || selectedDate || format(new Date(), "yyyy-MM-dd");
    if (editingLog) await handleUpdateDailyLog({ ...editingLog, ...logData });
    else
      await handleAddDailyLog({
        ...logData,
        teamMemberId: currentUser.id,
        date: dateToSave,
      });
    setIsLogFormOpen(false);
    setEditingLog(null);
  };
  const handleOpenLogForm = (logToEdit: DailyLog | null) => {
    setEditingLog(logToEdit);
    setIsLogFormOpen(true);
    if (selectedDate) setSelectedDate(null);
  };
  const handleJoinMeeting = (meeting: Meeting) =>
    onNavigate("meetingRoom", { meeting });
  const logsForSelectedDate = selectedDate
    ? myLogs.filter((log) =>
        isSameDay(new Date(log.date), new Date(selectedDate)),
      )
    : [];

  if (viewingTask) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex-1 h-full">
        <TaskDetailInline
          onClose={() => setViewingTask(null)}
          task={viewingTask}
        />
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            لوحة التحكم الشخصية
          </h2>
          <p className="text-md text-slate-500 dark:text-slate-400">
            مرحباً {currentUser?.name}، إليك نظرة على يومك.
          </p>
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse w-full sm:w-auto">
          <button
            onClick={() => handleOpenLogForm(null)}
            className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700"
          >
            <PlusIcon className="w-5 h-5" />
            <span>إضافة سجل عمل</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <StatCard
          onClick={() => onNavigate("timesheet")}
          icon={<ClockIcon className="w-8 h-8 text-sky-500" />}
          label="ساعات اليوم"
          value={todayHours.toFixed(1)}
        />
        <StatCard
          onClick={() => onNavigate("timesheet")}
          icon={<CalendarDaysIcon className="w-8 h-8 text-indigo-500" />}
          label="ساعات الأسبوع"
          value={thisWeekHours.toFixed(1)}
        />
        <StatCard
          onClick={() => onNavigate("myTasks")}
          icon={
            <ClipboardDocumentListIcon className="w-8 h-8 text-green-500" />
          }
          label="مهام مفتوحة"
          value={myOpenTasks.length}
        />
        <StatCard
          onClick={() => onNavigate("myTasks")}
          icon={<BellIcon className="w-8 h-8 text-amber-500" />}
          label="مهام قريبة"
          value={dueSoonCount}
        />
      </div>

      {isEmployee && (
        <div className="mb-6">
          <PunchClockWidget />
        </div>
      )}

      {/* Tasks and Activity - Side by side on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="h-[400px]">
          <MyTasksWidget
            tasks={myOpenTasks}
            projects={projects}
            onTaskClick={setViewingTask}
            onNavigate={onNavigate}
            isLoading={isTasksLoading}
          />
        </div>
        <div className="h-[400px]">
          <WeeklyActivityWidget logs={myLogs} />
        </div>
      </div>

      {/* Meetings and Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 h-[500px]">
          <MeetingsWidget meetings={myMeetings} onJoin={handleJoinMeeting} />
        </div>
        <div className="lg:col-span-2 h-[500px]">
          <CalendarWidget
            events={calendarEvents}
            onDateClick={handleDateClick}
            highlightedDate={selectedDate ? new Date(selectedDate) : null}
          />
        </div>
      </div>

      {selectedDate && (
        <DailyLogDetailModal
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          date={selectedDate}
          logs={logsForSelectedDate}
          onAdd={() => handleOpenLogForm(null)}
          onEdit={(log) => handleOpenLogForm(log)}
          onDelete={handleDeleteDailyLog}
          isEditable={
            selectedDate
              ? isDateEditableForLogging(new Date(selectedDate))
              : false
          }
        />
      )}

      {isLogFormOpen && currentUser && (
        <LogFormModal
          isOpen={isLogFormOpen}
          onClose={() => {
            setIsLogFormOpen(false);
            setEditingLog(null);
          }}
          onSave={handleSaveLog}
          log={editingLog}
          date={
            editingLog?.date || selectedDate || format(new Date(), "yyyy-MM-dd")
          }
          memberId={currentUser.id}
        />
      )}
    </div>
  );
};
