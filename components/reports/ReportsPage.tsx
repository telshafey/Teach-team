import React, { useState, useMemo } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { downloadCSV } from '../../utils/csv';
import { DocumentArrowDownIcon, DocumentDuplicateIcon, LockClosedIcon } from '../ui/Icons';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { EmptyState } from '../ui/EmptyState';
import { ChevronLeftIcon, ChevronRightIcon } from '../ui/Icons';
import { useAuth } from '../../contexts/AuthContext';
import { TeamMember } from '../../types';

type ReportType =
  | 'projects_summary'
  | 'tasks_detail'
  | 'employee_performance_general'
  | 'employee_performance_project'
  | 'expenses_general'
  | 'expenses_project';

const ROWS_PER_PAGE = 20;

export const ReportsPage: React.FC = () => {
    const { teamMembers, dailyLogs, expenseClaims, currency } = useAppDataContext();
    const { projects, tasks } = useProjectContext();
    const { currentUser, hasPermission } = useAuth();

    // State
    const [reportType, setReportType] = useState<ReportType>('projects_summary');
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        projectId: '',
        memberId: '',
        includeUnassigned: false,
    });
    const [generatedReport, setGeneratedReport] = useState<{ headers: string[], rows: any[] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // RBAC - Determine what data the current user can see
    const { visibleMembers, visibleProjects } = useMemo(() => {
        if (!currentUser) return { visibleMembers: [], visibleProjects: [] };

        // GM sees everything
        if (currentUser.roleId === 'gm') {
            return { visibleMembers: teamMembers, visibleProjects: projects };
        }

        // Regular employee sees only themself
        if (currentUser.roleId === 'employee' || currentUser.roleId === 'freelancer') {
             return { visibleMembers: [currentUser], visibleProjects: projects };
        }
        
        // Manager sees their team (direct and indirect reports)
        const getTeamIds = (managerId: number): number[] => {
            const team = [managerId];
            const directReports = teamMembers.filter(m => m.reportsTo === managerId);
            directReports.forEach(report => {
                team.push(...getTeamIds(report.id));
            });
            return team;
        };

        const myTeamIds = Array.from(new Set(getTeamIds(currentUser.id)));
        const teamMembersVisible = teamMembers.filter(m => myTeamIds.includes(m.id));
        
        const teamTaskProjectIds = new Set(tasks.filter(t => t.assignedTo && myTeamIds.includes(t.assignedTo)).map(t => t.projectId));
        const projectsVisible = projects.filter(p => teamTaskProjectIds.has(p.id));

        return { visibleMembers: teamMembersVisible, visibleProjects: projectsVisible };

    }, [currentUser, teamMembers, projects, tasks]);

    const handleGenerateReport = () => {
        setIsLoading(true);
        // Simulate generation time
        setTimeout(() => {
            const dateFilter = (dateStr: string) => {
                if (!filters.dateFrom && !filters.dateTo) return true;
                const date = parseISO(dateStr);
                const start = filters.dateFrom ? parseISO(filters.dateFrom) : new Date(0);
                const end = filters.dateTo ? parseISO(filters.dateTo) : new Date();
                return isWithinInterval(date, { start, end });
            };

            let headers: string[] = [];
            let rows: any[] = [];
            
            switch (reportType) {
                case 'projects_summary':
                    headers = ["المشروع", "الحالة", "إجمالي الساعات المسجلة", "التكلفة التقديرية"];
                    rows = visibleProjects.map(p => {
                        const projectLogs = dailyLogs.filter(l => l.projectId === p.id && dateFilter(l.date));
                        const totalHours = projectLogs.reduce((sum, l) => sum + l.hours, 0);
                        return [p.name, p.status, totalHours.toFixed(2), 'N/A'];
                    });
                    break;
                
                case 'tasks_detail':
                    headers = ["المهمة", "المشروع", "مسندة إلى", "الحالة", "تاريخ الاستحقاق"];
                    let tasksToReport = tasks.filter(t => visibleProjects.some(p => p.id === t.projectId));
                    if(filters.includeUnassigned) {
                        tasksToReport = tasksToReport.filter(t => !t.assignedTo);
                    }
                    if(filters.projectId) {
                        tasksToReport = tasksToReport.filter(t => t.projectId === filters.projectId);
                    }
                    rows = tasksToReport.map(t => {
                        const assignee = teamMembers.find(m => m.id === t.assignedTo);
                        return [t.title, projects.find(p=>p.id === t.projectId)?.name || '', assignee?.name || 'غير مسندة', t.status, t.dueDate || ''];
                    });
                    break;

                case 'employee_performance_general':
                case 'employee_performance_project':
                    if (!filters.memberId) {
                        alert('يرجى اختيار موظف.');
                        setIsLoading(false);
                        return;
                    }
                    headers = ["التاريخ", "المشروع", "الوصف", "الساعات"];
                    rows = dailyLogs
                        .filter(l => 
                            l.teamMemberId === Number(filters.memberId) && 
                            dateFilter(l.date) &&
                            (reportType === 'employee_performance_general' || l.projectId === filters.projectId)
                        ).map(l => [l.date, projects.find(p=>p.id === l.projectId)?.name || 'N/A', l.description, l.hours]);
                    
                    const totalHours = rows.reduce((sum, row) => sum + row[3], 0);
                    rows.push(['','','المجموع', totalHours.toFixed(2)]);
                    break;
                
                case 'expenses_general':
                case 'expenses_project':
                    headers = ["التاريخ", "الموظف", "المشروع", "المبلغ", "الوصف"];
                    rows = expenseClaims.filter(e => 
                        dateFilter(e.date) && e.status === 'approved' &&
                        (reportType === 'expenses_general' || e.projectId === filters.projectId)
                    ).map(e => {
                        const member = teamMembers.find(m => m.id === e.teamMemberId);
                        const project = projects.find(p => p.id === e.projectId);
                        return [e.date, member?.name || '', project?.name || 'N/A', `${e.amount} ${currency}`, e.description];
                    });
                     const totalAmount = rows.reduce((sum, row) => sum + parseFloat(row[3]), 0);
                     rows.push(['','','',`المجموع: ${totalAmount.toFixed(2)} ${currency}`,'']);
                    break;
            }

            setGeneratedReport({ headers, rows });
            setCurrentPage(1);
            setIsLoading(false);
        }, 500);
    };
    
    // Pagination logic
    const paginatedRows = useMemo(() => {
        if (!generatedReport) return [];
        const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
        return generatedReport.rows.slice(startIndex, startIndex + ROWS_PER_PAGE);
    }, [generatedReport, currentPage]);
    const totalPages = generatedReport ? Math.ceil(generatedReport.rows.length / ROWS_PER_PAGE) : 0;

    if (!hasPermission('view_reports')) {
         return (
            <div className="p-6">
                 <Card>
                    <div className="p-8 text-center">
                        <LockClosedIcon className="w-12 h-12 mx-auto text-red-500"/>
                        <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">وصول مرفوض</h2>
                        <p className="mt-2 text-md text-slate-500 dark:text-slate-400">ليس لديك الصلاحية لعرض هذه الصفحة.</p>
                    </div>
                 </Card>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">التقارير المخصصة</h2>
            <Card id="report-controls">
                <div className="p-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Report Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع التقرير</label>
                            <select value={reportType} onChange={e => setReportType(e.target.value as ReportType)} className="w-full p-2 border rounded-md">
                                <optgroup label="تقارير عامة">
                                    <option value="projects_summary">ملخص المشاريع</option>
                                    <option value="tasks_detail">تفاصيل المهام</option>
                                    <option value="expenses_general">المصروفات العامة</option>
                                </optgroup>
                                <optgroup label="تقارير مخصصة">
                                    <option value="employee_performance_general">أداء موظف (عام)</option>
                                    <option value="employee_performance_project">أداء موظف (مشروع)</option>
                                    <option value="expenses_project">مصروفات مشروع</option>
                                </optgroup>
                            </select>
                        </div>
                        {/* Date Filters */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">من تاريخ</label>
                            <input type="date" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} className="w-full p-2 border rounded-md"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">إلى تاريخ</label>
                            <input type="date" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} className="w-full p-2 border rounded-md"/>
                        </div>
                    </div>
                    {/* Dynamic Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(reportType === 'employee_performance_project' || reportType === 'expenses_project' || reportType === 'tasks_detail') && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المشروع</label>
                                <select value={filters.projectId} onChange={e => setFilters({...filters, projectId: e.target.value})} className="w-full p-2 border rounded-md">
                                    <option value="">كل المشاريع</option>
                                    {visibleProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        )}
                        {(reportType === 'employee_performance_general' || reportType === 'employee_performance_project') && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الموظف</label>
                                <select value={filters.memberId} onChange={e => setFilters({...filters, memberId: e.target.value})} className="w-full p-2 border rounded-md">
                                    <option value="">-- اختر موظف --</option>
                                    {visibleMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                        )}
                         {reportType === 'tasks_detail' && (
                            <div className="flex items-center pt-6">
                                <input type="checkbox" id="unassigned" checked={filters.includeUnassigned} onChange={e => setFilters({...filters, includeUnassigned: e.target.checked})} className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500" />
                                <label htmlFor="unassigned" className="ml-2 rtl:mr-2 block text-sm text-slate-900 dark:text-slate-200">
                                    عرض المهام غير المسندة فقط
                                </label>
                            </div>
                        )}
                    </div>
                    {/* Actions */}
                     <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t">
                        <button onClick={handleGenerateReport} disabled={isLoading} className="w-full sm:w-auto flex justify-center px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                           {isLoading ? 'جارٍ الإنشاء...' : 'إنشاء التقرير'}
                        </button>
                        {/* FIX: Replaced "..." with valid Tailwind CSS classes for styling. */}
                        <button onClick={() => generatedReport && downloadCSV(generatedReport.headers, generatedReport.rows, 'report')} disabled={!generatedReport} className="w-full sm:w-auto flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-50">
                           <DocumentArrowDownIcon className="w-5 h-5"/> <span>تنزيل (CSV)</span>
                        </button>
                         {/* FIX: Replaced "..." with valid Tailwind CSS classes for styling. */}
                         <button onClick={() => window.print()} disabled={!generatedReport} className="w-full sm:w-auto flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-50">
                           <DocumentDuplicateIcon className="w-5 h-5"/> <span>طباعة</span>
                        </button>
                    </div>
                </div>
            </Card>

            <div className="mt-6">
                <Card id="print-area">
                     {generatedReport ? (
                         <>
                            <div className="p-4 border-b">
                                <h3 className="font-semibold">نتائج التقرير</h3>
                                <p className="text-sm text-slate-500">عرض {Math.min((currentPage - 1) * ROWS_PER_PAGE + 1, generatedReport.rows.length)}-{Math.min(currentPage * ROWS_PER_PAGE, generatedReport.rows.length)} من {generatedReport.rows.length} نتيجة</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="text-xs uppercase bg-slate-50"><tr>{generatedReport.headers.map(h => <th key={h} className="px-6 py-3">{h}</th>)}</tr></thead>
                                    <tbody>
                                        {paginatedRows.map((row, rowIndex) => (
                                            <tr key={rowIndex} className="border-b">
                                                {row.map((cell:any, cellIndex:number) => <td key={cellIndex} className="px-6 py-4 whitespace-nowrap">{cell}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                             {totalPages > 1 && (
                                <div className="p-4 flex justify-between items-center text-sm">
                                    {/* FIX: Replaced "..." with valid Tailwind CSS classes for styling. */}
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"><ChevronRightIcon className="w-4 h-4"/> <span>السابق</span></button>
                                    <span>صفحة {currentPage} من {totalPages}</span>
                                    {/* FIX: Replaced "..." with valid Tailwind CSS classes for styling. */}
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"><span>التالي</span><ChevronLeftIcon className="w-4 h-4"/></button>
                                </div>
                            )}
                        </>
                    ) : (
                        <EmptyState title="لم يتم إنشاء تقرير بعد" message="اختر الإعدادات واضغط على 'إنشاء التقرير' لعرض البيانات." />
                    )}
                </Card>
            </div>
        </div>
    );
};
