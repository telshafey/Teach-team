import React, { useState, useMemo } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { downloadCSV } from '../../utils/csv';
import { DocumentArrowDownIcon } from '../ui/Icons';
import { DailyLog, Project, TeamMember, Task } from '../../types';
import { format } from 'date-fns';

type ReportType = 'time_activity' | 'project_summary' | 'task_status';

export const ReportsPage: React.FC = () => {
    const { teamMembers, dailyLogs } = useAppDataContext();
    const { projects, tasks } = useProjectContext();

    const [reportType, setReportType] = useState<ReportType>('time_activity');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

    const filteredLogs = useMemo(() => {
        return dailyLogs.filter(log => {
            const logDate = new Date(log.date);
            const isAfterFrom = !dateFrom || logDate >= new Date(dateFrom);
            const isBeforeTo = !dateTo || logDate <= new Date(dateTo);
            const inProject = selectedProjects.length === 0 || (log.projectId && selectedProjects.includes(log.projectId));
            const byMember = selectedMembers.length === 0 || selectedMembers.includes(log.teamMemberId);
            return isAfterFrom && isBeforeTo && inProject && byMember;
        });
    }, [dailyLogs, dateFrom, dateTo, selectedProjects, selectedMembers]);

    const handleDownload = () => {
        let headers: string[] = [];
        let data: (string | number | undefined)[][] = [];
        let filename = `report-${reportType}-${format(new Date(), 'yyyy-MM-dd')}`;

        const projectsMap = projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>);
        const membersMap = teamMembers.reduce((acc, m) => ({ ...acc, [m.id]: m.name }), {} as Record<number, string>);
        
        switch (reportType) {
            case 'time_activity':
                headers = ['التاريخ', 'الموظف', 'المشروع', 'المهمة', 'الوصف', 'الساعات'];
                data = filteredLogs.map(log => {
                    const task = tasks.find(t => t.id === log.taskId);
                    return [
                        log.date,
                        membersMap[log.teamMemberId] || log.teamMemberId,
                        log.projectId ? (projectsMap[log.projectId] || log.projectId) : 'N/A',
                        task?.title || '',
                        log.description,
                        log.hours.toFixed(2)
                    ];
                });
                break;
            
            case 'project_summary':
                headers = ['المشروع', 'إجمالي الساعات', 'عدد المهام', 'المهام المكتملة'];
                const projectData = projects.reduce((acc, p) => {
                    if (selectedProjects.length > 0 && !selectedProjects.includes(p.id)) return acc;
                    acc[p.id] = { name: p.name, hours: 0, taskCount: 0, doneCount: 0 };
                    return acc;
                }, {} as Record<string, {name: string, hours: number, taskCount: number, doneCount: number}>);

                filteredLogs.forEach(log => {
                    if (log.projectId && projectData[log.projectId]) {
                        projectData[log.projectId].hours += log.hours;
                    }
                });
                tasks.forEach(task => {
                    if (projectData[task.projectId]) {
                        projectData[task.projectId].taskCount++;
                        if (task.status === 'done') projectData[task.projectId].doneCount++;
                    }
                });
                // Fix: Explicitly type `p` to resolve the type inference issue.
                data = Object.values(projectData).map((p: {name: string, hours: number, taskCount: number, doneCount: number}) => [p.name, p.hours.toFixed(2), p.taskCount, p.doneCount]);
                break;
            
             case 'task_status':
                headers = ['المهمة', 'المشروع', 'مسندة إلى', 'الحالة', 'تاريخ الاستحقاق'];
                data = tasks
                    .filter(t => selectedProjects.length === 0 || selectedProjects.includes(t.projectId))
                    .filter(t => selectedMembers.length === 0 || (t.assignedTo && selectedMembers.includes(t.assignedTo)))
                    .map(task => [
                        task.title,
                        projectsMap[task.projectId] || task.projectId,
                        task.assignedTo ? (membersMap[task.assignedTo] || task.assignedTo) : 'غير مسندة',
                        task.status,
                        task.dueDate || ''
                    ]);
                break;
        }

        downloadCSV(headers, data, filename);
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">التقارير</h2>
                <p className="text-md text-slate-500 dark:text-slate-400">إنشاء وتصدير تقارير مخصصة.</p>
            </div>
            <Card>
                <div className="p-4 space-y-4">
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع التقرير</label>
                            <select value={reportType} onChange={e => setReportType(e.target.value as ReportType)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                                <option value="time_activity">الوقت والنشاط</option>
                                <option value="project_summary">ملخص المشاريع</option>
                                <option value="task_status">حالة المهام</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">من تاريخ</label>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">إلى تاريخ</label>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"/>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المشاريع</label>
                             <select multiple value={selectedProjects} onChange={e => setSelectedProjects(Array.from(e.target.selectedOptions, option => option.value))} className="w-full p-2 h-32 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                             </select>
                             <p className="text-xs text-slate-500 mt-1">اترك الحقل فارغًا لتحديد الكل.</p>
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">أعضاء الفريق</label>
                             <select multiple value={selectedMembers.map(String)} onChange={e => setSelectedMembers(Array.from(e.target.selectedOptions, option => Number(option.value)))} className="w-full p-2 h-32 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                             </select>
                             <p className="text-xs text-slate-500 mt-1">اترك الحقل فارغًا لتحديد الكل.</p>
                        </div>
                    </div>

                    {/* Action */}
                    <div className="flex justify-end pt-4">
                        <button onClick={handleDownload} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                           <DocumentArrowDownIcon className="w-5 h-5"/> <span>تنزيل التقرير (CSV)</span>
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
