import React, { useMemo } from 'react';
import { TeamMember, Role, EmploymentType } from '../../types';
import { Card } from '../ui/Card';
import { PerformanceSummaryCard } from '../dashboard/PerformanceSummaryCard';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
  isThisWeek,
  parseISO,
} from 'date-fns';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { BriefcaseIcon, ClockIcon, CurrencyDollarIcon, EnvelopeIcon, PencilIcon } from '../ui/Icons';

interface TeamMemberDetailPageProps {
  member: TeamMember;
  role: Role | undefined;
  manager: TeamMember | undefined;
  onEdit: (member: TeamMember) => void;
  canEdit: boolean;
}

export const TeamMemberDetailPage: React.FC<TeamMemberDetailPageProps> = ({ member, role, manager, onEdit, canEdit }) => {
    const { dailyLogs } = useTimeLogContext();
    const { tasks } = useProjectContext();
    const { currency } = useSettingsContext();

    const memberData = useMemo(() => {
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const endOfCurrentMonth = endOfMonth(now);
        const startOfLastMonth = startOfMonth(subMonths(now, 1));
        const endOfLastMonth = endOfMonth(subMonths(now, 1));

        const memberLogs = dailyLogs.filter(log => log.teamMemberId === member.id);
        const memberTasks = tasks.filter(task => task.assignedTo === member.id);

        const currentMonthHours = memberLogs
            .filter(log => isWithinInterval(parseISO(log.date), { start: startOfCurrentMonth, end: endOfCurrentMonth }))
            .reduce((sum, log) => sum + log.hours, 0);
        
        const lastMonthHours = memberLogs
            .filter(log => isWithinInterval(parseISO(log.date), { start: startOfLastMonth, end: endOfLastMonth }))
            .reduce((sum, log) => sum + log.hours, 0);
        
        const currentMonthTasks = memberTasks.filter(t => 
            t.status === 'done' && 
            t.dueDate && 
            isWithinInterval(parseISO(t.dueDate), { start: startOfCurrentMonth, end: endOfCurrentMonth })
        ).length;
        
        const lastMonthTasks = memberTasks.filter(t =>
            t.status === 'done' &&
            t.dueDate &&
            isWithinInterval(parseISO(t.dueDate), { start: startOfLastMonth, end: endOfLastMonth })
        ).length;

        const weeklyProductivity = memberLogs
            .filter(log => isThisWeek(parseISO(log.date)))
            .reduce((sum, log) => sum + log.hours, 0);

        return {
            currentMonthHours,
            lastMonthHours,
            currentMonthTasks,
            lastMonthTasks,
            weeklyProductivity,
            recentLogs: memberLogs.slice(-5),
            openTasks: memberTasks.filter(t => t.status !== 'done'),
        };
    }, [member, dailyLogs, tasks]);
    
    const employmentTypeMap: Record<EmploymentType, string> = {
        'full-time': 'دوام كامل',
        'part-time': 'دوام جزئي',
        'freelancer': 'مستقل',
    };
    const employmentType = employmentTypeMap[member.employmentType] || 'غير محدد';

    return (
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                     <Card 
                        title="معلومات الموظف"
                        headerActions={canEdit && (
                            <button onClick={() => onEdit(member)} className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 text-xs font-semibold text-sky-700 bg-sky-100 rounded-md hover:bg-sky-200">
                                <PencilIcon className="w-3 h-3"/>
                                <span>تعديل</span>
                            </button>
                        )}
                     >
                        <div className="flex flex-col items-center space-y-4">
                            <img src={member.avatarUrl} alt={member.name} className="w-24 h-24 rounded-full object-cover ring-4 ring-sky-200 dark:ring-sky-800" />
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{member.name}</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{role?.name}</p>
                                {manager && <p className="text-xs mt-2 text-slate-400">المدير المباشر: {manager.name}</p>}
                            </div>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-700 my-4"></div>
                        <div className="space-y-4 text-sm">
                            <div className="flex items-center">
                                <EnvelopeIcon className="w-5 h-5 text-slate-400 ml-3 rtl:ml-0 rtl:mr-3 flex-shrink-0"/>
                                <span className="text-slate-600 dark:text-slate-300 break-all">{member.email}</span>
                            </div>
                            <div className="flex items-center">
                                <BriefcaseIcon className="w-5 h-5 text-slate-400 ml-3 rtl:ml-0 rtl:mr-3"/>
                                <span className="text-slate-600 dark:text-slate-300">نوع الدوام:</span>
                                <span className="font-semibold mr-auto rtl:mr-0 rtl:ml-auto">{employmentType}</span>
                            </div>
                            {member.employmentType !== 'freelancer' && member.weeklyHoursRequirement != null && (
                                <div className="flex items-center">
                                    <ClockIcon className="w-5 h-5 text-slate-400 ml-3 rtl:ml-0 rtl:mr-3"/>
                                    <span className="text-slate-600 dark:text-slate-300">ساعات العمل الأسبوعية:</span>
                                    <span className="font-semibold mr-auto rtl:mr-0 rtl:ml-auto">{member.weeklyHoursRequirement} ساعة</span>
                                </div>
                            )}
                            {member.employmentType === 'freelancer' ? (
                                member.hourlyRate != null && (
                                    <div className="flex items-center">
                                        <CurrencyDollarIcon className="w-5 h-5 text-slate-400 ml-3 rtl:ml-0 rtl:mr-3"/>
                                        <span className="text-slate-600 dark:text-slate-300">سعر الساعة:</span>
                                        <span className="font-semibold mr-auto rtl:mr-0 rtl:ml-auto">{member.hourlyRate.toLocaleString()} {currency}</span>
                                    </div>
                                )
                            ) : (
                                member.salary != null && (
                                    <div className="flex items-center">
                                        <CurrencyDollarIcon className="w-5 h-5 text-slate-400 ml-3 rtl:ml-0 rtl:mr-3"/>
                                        <span className="text-slate-600 dark:text-slate-300">الراتب الشهري:</span>
                                        <span className="font-semibold mr-auto rtl:mr-0 rtl:ml-auto">{member.salary.toLocaleString()} {currency}</span>
                                    </div>
                                )
                            )}
                        </div>
                    </Card>
                </div>
                <div className="md:col-span-2">
                    <PerformanceSummaryCard 
                        currentMonthHours={memberData.currentMonthHours}
                        lastMonthHours={memberData.lastMonthHours}
                        currentMonthTasks={memberData.currentMonthTasks}
                        lastMonthTasks={memberData.lastMonthTasks}
                    />
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="المهام المفتوحة">
                    <div className="space-y-2">
                        {memberData.openTasks.slice(0, 5).map(task => (
                            <div key={task.id} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-md text-sm">{task.title}</div>
                        ))}
                         {memberData.openTasks.length === 0 && <p className="text-sm text-center text-slate-500 py-4">لا توجد مهام مفتوحة.</p>}
                    </div>
                </Card>
                <Card title="آخر الأنشطة">
                     <div className="space-y-2">
                        {memberData.recentLogs.map(log => (
                            <div key={log.id} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-md text-sm">
                                <span className="font-semibold">{log.hours} ساعة:</span> {log.description}
                            </div>
                        ))}
                        {memberData.recentLogs.length === 0 && <p className="text-sm text-center text-slate-500 py-4">لا توجد أنشطة مسجلة.</p>}
                    </div>
                </Card>
            </div>
        </div>
    );
};