import React, { useMemo, useState } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
// FIX: Corrected import path.
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { parseISO, isWithinInterval, format, subDays, startOfDay, endOfDay } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { stringify } from 'csv-stringify/browser/esm/sync';
import { DocumentArrowDownIcon, UsersIcon, ClockIcon, CheckCircleIcon } from '../ui/Icons';
import { BarChart, PieChart } from '../ui/Charts';

type ReportType = 'projects' | 'team_performance' | 'individual_logs';
type DatePreset = 'all' | 'last7' | 'last30' | 'custom';
type ActiveTab = 'overview' | 'projects' | 'team' | 'individual';

const KpiCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card className="h-full">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-sky-100 dark:bg-sky-900/50 rounded-lg text-sky-600 dark:text-sky-400">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            </div>
        </div>
    </Card>
);

export const ReportsPage: React.FC = () => {
    const { teamMembers, dailyLogs, siteSettings } = useAppDataContext();
    const { projects, tasks } = useProjectContext();
    
    const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [datePreset, setDatePreset] = useState<DatePreset>('all');
    const [customStartDate, setCustomStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const { startDate, endDate } = useMemo(() => {
        const now = new Date();
        switch (datePreset) {
            case 'last7': return { startDate: startOfDay(subDays(now, 6)), endDate: endOfDay(now) };
            case 'last30': return { startDate: startOfDay(subDays(now, 29)), endDate: endOfDay(now) };
            case 'custom': return { startDate: startOfDay(parseISO(customStartDate)), endDate: endOfDay(parseISO(customEndDate)) };
            case 'all': default: return { startDate: null, endDate: null };
        }
    }, [datePreset, customStartDate, customEndDate]);

    const filteredLogs = useMemo(() => {
        if (!startDate || !endDate) return dailyLogs;
        return dailyLogs.filter(log => isWithinInterval(parseISO(log.date), { start: startDate, end: endDate }));
    }, [dailyLogs, startDate, endDate]);

    const teamPerformance = useMemo(() => {
        return teamMembers.map(member => {
            const memberLogs = filteredLogs.filter(log => log.teamMemberId === member.id);
            const memberTasks = tasks.filter(task => task.assignedTo === member.id);
            const completedTasks = memberTasks.filter(t => t.status === 'done' && (!startDate || (t.dueDate && isWithinInterval(parseISO(t.dueDate), {start: startDate, end: endDate})))).length;
            const totalHours = memberLogs.reduce((sum, log) => sum + log.hours, 0);
            return { id: member.id, name: member.name, totalHours, completedTasks };
        }).sort((a,b) => b.totalHours - a.totalHours);
    }, [teamMembers, filteredLogs, tasks, startDate, endDate]);

    const projectProgress = useMemo(() => {
        return projects.map(project => {
            const projectTasks = tasks.filter(t => t.projectId === project.id);
            const completedTasks = projectTasks.filter(t => t.status === 'done').length;
            const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
            const loggedHours = filteredLogs.filter(l => l.projectId === project.id).reduce((sum, l) => sum + l.hours, 0);
            return { id: project.id, name: project.name, status: project.status, progress, loggedHours, budgetHours: project.budgetHours };
        });
    }, [projects, tasks, filteredLogs]);
    
    const kpiData = useMemo(() => {
        const totalHours = filteredLogs.reduce((sum, log) => sum + log.hours, 0);
        const tasksCompleted = tasks.filter(t => t.status === 'done' && (!startDate || (t.dueDate && isWithinInterval(parseISO(t.dueDate), {start: startDate, end: endDate})))).length;
        
        const hoursByDay = filteredLogs.reduce((acc, log) => {
            const day = format(parseISO(log.date), 'eeee', { locale: arSA });
            acc[day] = (acc[day] || 0) + log.hours;
            return acc;
        }, {} as Record<string, number>);
        // FIX: Cast entry values to number for arithmetic operations, as Object.entries may not infer the value type strictly.
        const busiestDayEntry = Object.entries(hoursByDay).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
        const mostProductiveMember = teamPerformance[0];

        return {
            totalHoursLogged: `${totalHours.toFixed(1)} ساعة`,
            totalTasksCompleted: `${tasksCompleted} مهمة`,
            // FIX: Cast entry value to number to use number methods like toFixed.
            busiestDay: busiestDayEntry ? `${busiestDayEntry[0]} (${(busiestDayEntry[1] as number).toFixed(1)} س)` : 'N/A',
            mostProductiveMember: mostProductiveMember && mostProductiveMember.totalHours > 0 ? `${mostProductiveMember.name} (${mostProductiveMember.totalHours.toFixed(1)} س)`: 'N/A',
        };
    }, [filteredLogs, tasks, teamPerformance, startDate, endDate]);

    const individualMemberData = useMemo(() => {
        if (!selectedMemberId) return null;
        const memberId = parseInt(selectedMemberId);
        const member = teamMembers.find(m => m.id === memberId);
        if (!member) return null;

        const memberLogs = filteredLogs.filter(log => log.teamMemberId === memberId);
        const projectsMap = projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string,string>);
        
        const hoursByProject = memberLogs.reduce((acc, log) => {
            const projectName = log.projectId ? projectsMap[log.projectId] : 'مهام أخرى';
            acc[projectName] = (acc[projectName] || 0) + log.hours;
            return acc;
        }, {} as Record<string, number>);
        
        const projectChartData = Object.entries(hoursByProject).map(([label, value], i) => ({
            label, value, color: ['#38bdf8', '#60a5fa', '#34d399', '#f59e0b', '#a78bfa'][i % 5]
        }));
        
        return { member, logs: memberLogs, projectChartData, totalHours: memberLogs.reduce((sum, log) => sum + log.hours, 0) };
    }, [selectedMemberId, teamMembers, filteredLogs, projects]);

    const handlePrint = () => window.print();

    const handleExport = (reportType: ReportType) => {
        let data: any[], columns: Record<string, string>;
        let filename = 'report';

        switch(reportType) {
            case 'projects':
                data = projectProgress.map(p => ({...p, progress: `${p.progress.toFixed(0)}%`}));
                columns = { name: 'المشروع', status: 'الحالة', progress: 'التقدم', loggedHours: 'الساعات المسجلة', budgetHours: 'الميزانية' };
                filename = 'projects-report';
                break;
            case 'team_performance':
                data = teamPerformance;
                columns = { name: 'العضو', totalHours: 'إجمالي الساعات', completedTasks: 'المهام المكتملة' };
                filename = 'team-performance-report';
                break;
            case 'individual_logs':
                if (!individualMemberData) return;
                data = individualMemberData.logs.map(l => ({
                    date: l.date,
                    project: projects.find(p=>p.id === l.projectId)?.name || 'أخرى',
                    hours: l.hours,
                    description: l.description,
                }));
                columns = { date: "التاريخ", project: "المشروع", hours: "الساعات", description: "الوصف" };
                filename = `logs-report-${individualMemberData.member.name}`;
                break;
            default: return;
        }

        const csvString = stringify(data, { header: true, columns });
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
    };
    
    const renderDateRangeText = () => {
        if (datePreset === 'all') return "لكل الأوقات";
        if (startDate && endDate) return `${format(startDate, 'd MMM yyyy', {locale: arSA})} - ${format(endDate, 'd MMM yyyy', {locale: arSA})}`;
        return '';
    };

    const tabs = [
        { id: 'overview', label: 'نظرة عامة' },
        { id: 'projects', label: 'المشاريع' },
        { id: 'team', label: 'الفريق' },
        { id: 'individual', label: 'تقرير فردي' },
    ];
    
    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <KpiCard title="إجمالي الساعات المسجلة" value={kpiData.totalHoursLogged} icon={<ClockIcon className="w-6 h-6"/>} />
                            <KpiCard title="إجمالي المهام المكتملة" value={kpiData.totalTasksCompleted} icon={<CheckCircleIcon className="w-6 h-6"/>} />
                            <KpiCard title="اليوم الأكثر إنتاجية" value={kpiData.busiestDay} icon={<UsersIcon className="w-6 h-6"/>} />
                            <KpiCard title="العضو الأكثر إنتاجية" value={kpiData.mostProductiveMember} icon={<UsersIcon className="w-6 h-6"/>} />
                        </div>
                        <Card title="إنتاجية الفريق (أعلى 10)">
                            <BarChart title="" data={teamPerformance.slice(0, 10).map(m => ({ label: m.name, value: m.totalHours }))} />
                        </Card>
                    </div>
                );
            case 'projects':
                return (
                    <Card title="تفاصيل تقدم المشاريع" headerActions={<button onClick={() => handleExport('projects')} className="text-sm font-semibold text-sky-600">تصدير CSV</button>}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">المشروع</th><th scope="col" className="px-6 py-3">الحالة</th><th scope="col" className="px-6 py-3">التقدم</th><th scope="col" className="px-6 py-3">الساعات (المسجلة/الميزانية)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectProgress.map(p => (
                                        <tr key={p.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                                            <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{p.name}</th>
                                            <td className="px-6 py-4">{p.status}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center"><div className="w-20 bg-slate-200 rounded-full h-2.5 dark:bg-slate-700 mr-2 rtl:mr-0 rtl:ml-2"><div className="bg-sky-500 h-2.5 rounded-full" style={{ width: `${p.progress}%` }}></div></div><span>{p.progress.toFixed(0)}%</span></div>
                                            </td>
                                            <td className="px-6 py-4">{p.loggedHours.toFixed(1)} / {p.budgetHours || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                );
            case 'team':
                return (
                    <Card title="تقرير أداء الفريق" headerActions={<button onClick={() => handleExport('team_performance')} className="text-sm font-semibold text-sky-600">تصدير CSV</button>}>
                         <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                                    <tr><th scope="col" className="px-6 py-3">عضو الفريق</th><th scope="col" className="px-6 py-3">إجمالي الساعات المسجلة</th><th scope="col" className="px-6 py-3">المهام المكتملة</th></tr>
                                </thead>
                                <tbody>
                                    {teamPerformance.map(m => (
                                        <tr key={m.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                                            <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{m.name}</th>
                                            <td className="px-6 py-4">{m.totalHours.toFixed(1)}</td><td className="px-6 py-4">{m.completedTasks}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                );
            case 'individual':
                return (
                    <div className="space-y-6">
                        <Card>
                            <label htmlFor="member-select" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">اختر عضو الفريق لعرض تقريره</label>
                            <select id="member-select" value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)} className="w-full max-w-xs py-2 pr-3 pl-8 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-700 dark:text-white">
                                <option value="">-- اختر عضو الفريق --</option>
                                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </Card>
                        {individualMemberData ? (
                            <div className="space-y-6">
                                <Card title={`توزيع ساعات ${individualMemberData.member.name}`}><PieChart data={individualMemberData.projectChartData} /></Card>
                                <Card title="سجل الأنشطة" headerActions={<button onClick={() => handleExport('individual_logs')} className="text-sm font-semibold text-sky-600">تصدير CSV</button>}>
                                     <div className="overflow-x-auto max-h-96">
                                        <table className="w-full text-sm text-right">
                                            <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300 sticky top-0">
                                                <tr><th className="px-4 py-2">التاريخ</th><th className="px-4 py-2">المشروع</th><th className="px-4 py-2">الساعات</th><th className="px-4 py-2">الوصف</th></tr>
                                            </thead>
                                            <tbody>
                                                {individualMemberData.logs.length > 0 ? individualMemberData.logs.map(log => (
                                                    <tr key={log.id} className="border-b dark:border-slate-700"><td className="px-4 py-2">{log.date}</td><td className="px-4 py-2">{projects.find(p=>p.id === log.projectId)?.name || 'أخرى'}</td><td className="px-4 py-2">{log.hours.toFixed(1)}</td><td className="px-4 py-2 max-w-xs truncate" title={log.description}>{log.description}</td></tr>
                                                )) : (
                                                    <tr><td colSpan={4} className="text-center p-4 text-slate-500">لا توجد سجلات لهذا العضو في النطاق الزمني المحدد.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        ) : selectedMemberId && <Card><p className="text-center text-slate-500">لا توجد بيانات لهذا العضو في النطاق الزمني المحدد.</p></Card>}
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">التقارير المتقدمة</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">تحليلات مفصلة للأداء والإنتاجية.</p>
                </div>
                 <div id="report-controls" className="flex items-center flex-wrap gap-2">
                    <select value={datePreset} onChange={e => setDatePreset(e.target.value as DatePreset)} className="py-2 pr-3 pl-8 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-700 dark:text-white">
                        <option value="all">كل الأوقات</option><option value="last7">آخر 7 أيام</option><option value="last30">آخر 30 يوم</option><option value="custom">تاريخ مخصص</option>
                    </select>
                    {datePreset === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="py-1.5 px-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"/>
                            <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="py-1.5 px-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"/>
                        </div>
                    )}
                    <button onClick={handlePrint} className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600">
                        <DocumentArrowDownIcon className="w-5 h-5"/>
                        <span>تصدير PDF</span>
                    </button>
                </div>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-6 rtl:space-x-reverse overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as ActiveTab)} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                           {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            
            <style>{`
                @media print {
                    body > *:not(#print-area) {
                        display: none;
                    }
                    #print-area {
                        display: block;
                        position: absolute;
                        left: 0;
                        top: 0;
                    }
                    .print-header { display: block !important; }
                }
            `}</style>
            <div id="print-area" className="space-y-6">
                <div className="print-header hidden print:block mb-4">
                    {siteSettings?.logoUrl && <img src={siteSettings.logoUrl} alt="Logo" className="h-12 mb-4"/>}
                    <h3 className="text-xl font-bold text-slate-800">تقرير {tabs.find(t=>t.id === activeTab)?.label} - {siteSettings?.appName}</h3>
                    <p className="text-sm text-slate-600">{renderDateRangeText()}</p>
                </div>
                {renderContent()}
            </div>
        </div>
    );
};
