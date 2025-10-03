import React, { useMemo, useState } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { parseISO, isWithinInterval, format, subDays, startOfDay, endOfDay } from 'date-fns';
import { stringify } from 'csv-stringify/browser/esm/sync';
import { PrinterIcon } from '../ui/Icons';

type ReportType = 'projects' | 'team_productivity' | 'team_performance';
type DatePreset = 'all' | 'last7' | 'last30' | 'custom';

export const ReportsPage: React.FC = () => {
    const { teamMembers, dailyLogs } = useAppDataContext();
    const { projects, tasks } = useProjectContext();
    
    const [datePreset, setDatePreset] = useState<DatePreset>('all');
    const [customStartDate, setCustomStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const { startDate, endDate } = useMemo(() => {
        const now = new Date();
        switch (datePreset) {
            case 'last7':
                return { startDate: startOfDay(subDays(now, 6)), endDate: endOfDay(now) };
            case 'last30':
                return { startDate: startOfDay(subDays(now, 29)), endDate: endOfDay(now) };
            case 'custom':
                return { startDate: startOfDay(parseISO(customStartDate)), endDate: endOfDay(parseISO(customEndDate)) };
            case 'all':
            default:
                return { startDate: null, endDate: null };
        }
    }, [datePreset, customStartDate, customEndDate]);

    const filteredLogs = useMemo(() => {
        if (!startDate || !endDate) return dailyLogs;
        return dailyLogs.filter(log => isWithinInterval(parseISO(log.date), { start: startDate, end: endDate }));
    }, [dailyLogs, startDate, endDate]);

    const filteredTasks = useMemo(() => {
        if (!startDate || !endDate) return tasks;
        // Filter tasks completed within the date range
        return tasks.filter(task => {
            if (task.status === 'done' && task.dueDate) {
                return isWithinInterval(parseISO(task.dueDate), { start: startDate, end: endDate });
            }
            return true; // Include non-completed tasks for context
        });
    }, [tasks, startDate, endDate]);

    const projectProgress = useMemo(() => {
        return projects.map(project => {
            const projectTasks = filteredTasks.filter(t => t.projectId === project.id);
            const completedTasks = projectTasks.filter(t => t.status === 'done').length;
            const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
            const loggedHours = filteredLogs.filter(l => l.projectId === project.id).reduce((sum, l) => sum + l.hours, 0);
            return {
                id: project.id,
                name: project.name,
                status: project.status,
                progress,
                loggedHours,
                budgetHours: project.budgetHours,
                taskCount: projectTasks.length,
            };
        });
    }, [projects, filteredTasks, filteredLogs]);
    
    const teamPerformance = useMemo(() => {
        return teamMembers.map(member => {
            const memberLogs = filteredLogs.filter(log => log.teamMemberId === member.id);
            const memberTasks = filteredTasks.filter(task => task.assignedTo === member.id);
            const completedTasks = memberTasks.filter(t => t.status === 'done').length;
            const totalHours = memberLogs.reduce((sum, log) => sum + log.hours, 0);
            const avgHoursPerTask = completedTasks > 0 ? totalHours / completedTasks : 0;
            return {
                id: member.id,
                name: member.name,
                totalHours,
                completedTasks,
                avgHoursPerTask,
            };
        });
    }, [teamMembers, filteredLogs, filteredTasks]);

    const handlePrint = () => window.print();

    const handleExport = (reportType: ReportType) => {
        let data: any[], columns: any;
        let filename = 'report';

        switch(reportType) {
            case 'projects':
                data = projectProgress;
                columns = { id: 'ID', name: 'المشروع', status: 'الحالة', progress: 'التقدم', loggedHours: 'الساعات المسجلة', budgetHours: 'الميزانية', taskCount: 'عدد المهام' };
                filename = 'report-projects';
                break;
            case 'team_performance':
                data = teamPerformance;
                columns = { id: 'ID', name: 'العضو', totalHours: 'إجمالي الساعات', completedTasks: 'المهام المكتملة', avgHoursPerTask: 'متوسط ساعة/مهمة' };
                filename = 'report-team-performance';
                break;
            default:
                return;
        }

        const csvString = stringify([columns, ...data], { header: true });
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
    };


    return (
        <div className="p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">التقارير</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">ملخصات الأداء للمشاريع والفريق.</p>
                </div>
                 <div id="report-controls" className="flex items-center flex-wrap gap-2">
                    <select value={datePreset} onChange={e => setDatePreset(e.target.value as DatePreset)} className="py-2 pr-3 pl-8 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-700 dark:text-white">
                        <option value="all">كل الأوقات</option>
                        <option value="last7">آخر 7 أيام</option>
                        <option value="last30">آخر 30 يوم</option>
                        <option value="custom">تاريخ مخصص</option>
                    </select>
                    {datePreset === 'custom' && (
                        <>
                            <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="py-1.5 px-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"/>
                            <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="py-1.5 px-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"/>
                        </>
                    )}
                    <button onClick={handlePrint} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"><PrinterIcon className="w-5 h-5"/></button>
                </div>
            </div>

            <div id="print-area" className="space-y-6">
                 <Card title="تقرير تقدم المشاريع" headerActions={<button onClick={() => handleExport('projects')} className="text-sm font-semibold text-sky-600">تصدير CSV</button>}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                                <tr>
                                    <th scope="col" className="px-6 py-3">المشروع</th>
                                    <th scope="col" className="px-6 py-3">الحالة</th>
                                    <th scope="col" className="px-6 py-3">التقدم</th>
                                    <th scope="col" className="px-6 py-3">الساعات (المسجلة/الميزانية)</th>
                                    <th scope="col" className="px-6 py-3">المهام</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projectProgress.map(p => (
                                    <tr key={p.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                                        <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{p.name}</th>
                                        <td className="px-6 py-4">{p.status}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-20 bg-slate-200 rounded-full h-2.5 dark:bg-slate-700 mr-2 rtl:mr-0 rtl:ml-2">
                                                    <div className="bg-sky-500 h-2.5 rounded-full" style={{ width: `${p.progress}%` }}></div>
                                                </div>
                                                <span>{p.progress.toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{p.loggedHours.toFixed(1)} / {p.budgetHours || 'N/A'}</td>
                                        <td className="px-6 py-4">{p.taskCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card title="تقرير أداء الفريق" headerActions={<button onClick={() => handleExport('team_performance')} className="text-sm font-semibold text-sky-600">تصدير CSV</button>}>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                                <tr>
                                    <th scope="col" className="px-6 py-3">عضو الفريق</th>
                                    <th scope="col" className="px-6 py-3">إجمالي الساعات المسجلة</th>
                                    <th scope="col" className="px-6 py-3">المهام المكتملة</th>
                                    <th scope="col" className="px-6 py-3">متوسط الساعات لكل مهمة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamPerformance.map(m => (
                                    <tr key={m.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                                        <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{m.name}</th>
                                        <td className="px-6 py-4">{m.totalHours.toFixed(1)}</td>
                                        <td className="px-6 py-4">{m.completedTasks}</td>
                                        <td className="px-6 py-4 font-semibold">{m.avgHoursPerTask.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};
