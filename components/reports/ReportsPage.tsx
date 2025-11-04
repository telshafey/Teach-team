import React, { useState, useMemo } from 'react';
import { useTeamContext } from '../../contexts/TeamContext';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { useRequestsContext } from '../../contexts/RequestsContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { Card } from '../ui/Card';
import { downloadCSV } from '../../utils/csv';
import { DocumentArrowDownIcon, DocumentDuplicateIcon, LockClosedIcon } from '../ui/Icons';
import { EmptyState } from '../ui/EmptyState';
import { ChevronLeftIcon, ChevronRightIcon } from '../ui/Icons';
import { useAuth } from '../../contexts/AuthContext';
import * as reportService from '../../services/reportService';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../../contexts/SupabaseContext';
import * as api from '../../services/apiService';
import { Project, Task } from '../../types';

type ReportType =
  | 'projects_summary'
  | 'tasks_detail'
  | 'employee_performance_general'
  | 'employee_performance_project'
  | 'expenses_general'
  | 'expenses_project';

const ROWS_PER_PAGE = 20;

export const ReportsPage: React.FC = () => {
    const { teamMembers, hasPermission } = useTeamContext();
    const { dailyLogs } = useTimeLogContext();
    const { expenseClaims } = useRequestsContext();
    const { currency } = useSettingsContext();
    const { currentUser } = useAuth();
    const { supabaseClient } = useSupabase();

    const { data: projects = [] } = useQuery<Project[]>({
      queryKey: ['projects'],
      queryFn: () => api.getAll(supabaseClient!, 'projects'),
      enabled: !!supabaseClient,
    });
    
    const { data: tasks = [] } = useQuery<Task[]>({
      queryKey: ['tasks'],
      queryFn: () => api.getAll(supabaseClient!, 'tasks'),
      enabled: !!supabaseClient,
    });

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

        // GM and Managers can see all projects in the filter dropdown.
        // The data within the reports will still be scoped correctly for managers.
        const canSeeAllProjects = currentUser.roleId === 'gm' || currentUser.roleId === 'manager';

        // Regular employee sees only themself
        if (!canSeeAllProjects) {
             return { visibleMembers: [currentUser], visibleProjects: projects };
        }
        
        // Manager sees their team (direct and indirect reports) for member-based reports
        const getTeamIds = (managerId: number): number[] => {
            const team = [managerId];
            const directReports = teamMembers.filter(m => m.reportsTo === managerId);
            directReports.forEach(report => {
                team.push(...getTeamIds(report.id));
            });
            return team;
        };
        
        const myTeamIds = currentUser.roleId === 'gm' 
            ? teamMembers.map(m => m.id)
            : Array.from(new Set(getTeamIds(currentUser.id)));
        
        const teamMembersVisible = teamMembers.filter(m => myTeamIds.includes(m.id));
        
        return { visibleMembers: teamMembersVisible, visibleProjects: projects };

    }, [currentUser, teamMembers, projects]);

    const handleGenerateReport = () => {
        setIsLoading(true);
        let reportData: { headers: string[], rows: any[] } | null = null;
        
        const serviceFilters = { ...filters };

        switch (reportType) {
            case 'projects_summary':
                reportData = reportService.generateProjectsSummary(visibleProjects, dailyLogs, serviceFilters);
                break;
            
            case 'tasks_detail':
                reportData = reportService.generateTasksDetail(tasks, visibleProjects, teamMembers, serviceFilters);
                break;

            case 'employee_performance_general':
                reportData = reportService.generateEmployeePerformance(dailyLogs, projects, serviceFilters, false);
                break;
            case 'employee_performance_project':
                if (!filters.memberId) {
                    alert('يرجى اختيار موظف.');
                    setIsLoading(false);
                    return;
                }
                reportData = reportService.generateEmployeePerformance(dailyLogs, projects, serviceFilters, true);
                break;
            
            case 'expenses_general':
                reportData = reportService.generateExpenses(expenseClaims, projects, teamMembers, currency, serviceFilters, false);
                break;
            case 'expenses_project':
                reportData = reportService.generateExpenses(expenseClaims, projects, teamMembers, currency, serviceFilters, true);
                break;
        }

        setGeneratedReport(reportData);
        setCurrentPage(1);
        setIsLoading(false);
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
                        <button onClick={() => generatedReport && downloadCSV(generatedReport.headers, generatedReport.rows, 'report')} disabled={!generatedReport} className="w-full sm:w-auto flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-50">
                           <DocumentArrowDownIcon className="w-5 h-5"/> <span>تنزيل (CSV)</span>
                        </button>
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
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"><ChevronRightIcon className="w-4 h-4"/> <span>السابق</span></button>
                                    <span>صفحة {currentPage} من {totalPages}</span>
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