import React, { useMemo, useState, useEffect } from 'react';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import { Card } from '../ui/Card';
import { BarChart, LineChart } from '../ui/Charts';
import { FolderIcon, ClockIcon, BellIcon, CurrencyDollarIcon, PlusIcon, CheckIcon, WrenchScrewdriverIcon } from '../ui/Icons';
import { Project, Meeting, Task } from '@shared/types';
import { isThisWeek, parseISO, eachDayOfInterval, subDays, format } from 'date-fns';
import { UpcomingMeetingsCard } from './UpcomingMeetingsCard';
import { useNavigation } from '@shared/contexts/NavigationContext';
import { usePendingApprovals } from '@shared/hooks/usePendingApprovals';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { StatusBadge } from '../ui/StatusBadge';
import { StatCard } from './StatCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useAuth } from '@shared/contexts/AuthContext';
import { useToast } from '@shared/contexts/ToastContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Widget Components
const StatCardsWidget: React.FC<{ data: { activeProjects: number; weeklyHours: number; pendingItems: number; totalBudget: number; }; currency: string; onNavigate: (view: any, props?: any) => void; }> = ({ data, currency, onNavigate }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 h-full">
        <StatCard onClick={() => onNavigate('projects', { initialState: { statusFilter: 'نشط' } })} icon={<FolderIcon className="w-8 h-8 text-sky-500" />} label="مشاريع نشطة" value={data.activeProjects} />
        <StatCard onClick={() => onNavigate('reports')} icon={<ClockIcon className="w-8 h-8 text-indigo-500" />} label="ساعات العمل (الأسبوع)" value={data.weeklyHours.toFixed(1)} />
        <StatCard onClick={() => onNavigate('approvals')} icon={<BellIcon className="w-8 h-8 text-amber-500" />} label="موافقات معلقة" value={data.pendingItems} />
        <StatCard onClick={() => onNavigate('finance', { initialView: 'project_financials' })} icon={<CurrencyDollarIcon className="w-8 h-8 text-green-500" />} label="إجمالي الميزانيات" value={`${(data.totalBudget / 1000).toFixed(1)}k`} />
    </div>
);

const CompanyProductivityWidget: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => (
    <Card title="إنتاجية الشركة (آخر 30 يوم)">
        <div className="h-full min-h-[200px] flex items-center justify-center">
            <LineChart data={data} height={200} />
        </div>
    </Card>
);

const ProjectOverviewWidget: React.FC<{ projects: Project[]; dailyLogs: any[]; currency: string; }> = ({ projects, dailyLogs, currency }) => (
    <Card title="نظرة عامة على المشاريع النشطة">
        <div className="flex-1 flex flex-col space-y-4 pt-2 overflow-y-auto pr-1 pb-2">
            {projects.filter(p => p.status === 'نشط').slice(0, 20).map(p => {
                const hours = dailyLogs.filter(l => l.projectId === p.id).reduce((s, l) => s + l.hours, 0);
                const progressPercent = p.budgetHours ? Math.min(100, Math.round((hours / p.budgetHours) * 100)) : 0;
                
                return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors dark:bg-slate-800/50 dark:border-slate-700/50 dark:hover:border-slate-700">
                        <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                            <span className="text-xs text-slate-500 mt-1 dark:text-slate-400">التكلفة:  {p.budgetAmount?.toLocaleString() || '-'} {currency}</span>
                        </div>
                        <div className="flex items-center space-x-4 rtl:space-x-reverse">
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    {hours.toFixed(1)} / {p.budgetHours || '∞'} س
                                </span>
                                {p.budgetHours && (
                                    <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden dark:bg-slate-600">
                                        <div className={`h-full ${progressPercent > 90 ? 'bg-red-500' : progressPercent > 70 ? 'bg-amber-500' : 'bg-sky-500'}`} style={{ width: `${progressPercent}%` }}></div>
                                    </div>
                                )}
                            </div>
                            <StatusBadge status={p.status} type="project" />
                        </div>
                    </div>
                );
            })}
        </div>
    </Card>
);

const TeamProductivityWidget: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => (
    <Card title="أداء أفضل 10 موظفين (الأسبوع)">
        <div className="flex-1 overflow-y-auto pr-1 pb-2">
            <BarChart title="" data={data} />
        </div>
    </Card>
);

const UpcomingMeetingsWidget: React.FC<{ meetings: Meeting[]; onJoin: (m: Meeting) => void; }> = ({ meetings, onJoin }) => (
    <UpcomingMeetingsCard title="الاجتماعات القادمة" meetings={meetings} onJoinMeeting={onJoin} />
);

// Main Dashboard Component
export const GeneralManagerDashboard: React.FC = () => {
    const { onNavigate } = useNavigation();
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const { teamMembers } = useTeamContext();
    const { dailyLogs } = useTimeLogContext();
    const { pendingItems } = usePendingApprovals();
    const { currency } = useSettingsContext();
    const { supabaseClient } = useSupabase();

    const [isEditing, setIsEditing] = useState(false);

    const { data: meetings = [] } = useQuery<Meeting[]>({ queryKey: ['meetings'], queryFn: () => api.getAll(supabaseClient!, 'meetings'), enabled: !!supabaseClient });
    const { data: projects = [] } = useQuery<Project[]>({ queryKey: ['projects'], queryFn: () => api.getAll(supabaseClient!, 'projects'), enabled: !!supabaseClient });

    const defaultLayouts = {
        lg: [
            { i: 'stats', x: 0, y: 0, w: 12, h: 2 },
            { i: 'productivity', x: 0, y: 2, w: 8, h: 5 },
            { i: 'team', x: 8, y: 2, w: 4, h: 6 },
            { i: 'projects', x: 0, y: 7, w: 8, h: 6 },
            { i: 'meetings', x: 8, y: 8, w: 4, h: 5 },
        ],
        md: [
            { i: 'stats', x: 0, y: 0, w: 12, h: 2 },
            { i: 'productivity', x: 0, y: 2, w: 12, h: 5 },
            { i: 'team', x: 0, y: 7, w: 6, h: 6 },
            { i: 'projects', x: 0, y: 13, w: 12, h: 5 },
            { i: 'meetings', x: 6, y: 7, w: 6, h: 6 },
        ],
        sm: [
            { i: 'stats', x: 0, y: 0, w: 6, h: 4 },
            { i: 'productivity', x: 0, y: 4, w: 6, h: 5 },
            { i: 'team', x: 0, y: 9, w: 6, h: 6 },
            { i: 'projects', x: 0, y: 15, w: 6, h: 5 },
            { i: 'meetings', x: 0, y: 20, w: 6, h: 5 },
        ]
    };

    const [layouts, setLayouts] = useState(defaultLayouts);

    const { data: savedLayouts } = useQuery({
        queryKey: ['user_preference', 'dashboard_layout_gm_v4'],
        queryFn: () => api.getUserPreference<typeof defaultLayouts>(supabaseClient!, currentUser!.id, 'dashboard_layout_gm_v4'),
        enabled: !!supabaseClient && !!currentUser,
    });

    useEffect(() => {
        if (savedLayouts) {
            // Merge saved layout with default to ensure new widgets are included
            const newLayouts: any = {};
            for (const breakpoint of ['lg', 'md', 'sm']) {
                const defaultItems = defaultLayouts[breakpoint as keyof typeof defaultLayouts];
                const savedItems = savedLayouts[breakpoint as keyof typeof savedLayouts] || [];
                const savedItemsMap = new Map(savedItems.map(item => [item.i, item]));
                newLayouts[breakpoint] = defaultItems.map(defaultItem => savedItemsMap.get(defaultItem.i) || defaultItem);
            }
            setLayouts(newLayouts);
        }
    }, [savedLayouts]);

    const saveLayoutMutation = useMutation({
        mutationFn: (newLayouts: typeof defaultLayouts) => api.setUserPreference(supabaseClient!, currentUser!.id, 'dashboard_layout_gm_v4', newLayouts),
        onSuccess: () => {
            addToast('تم حفظ تخطيط اللوحة بنجاح.', 'success');
            queryClient.invalidateQueries({ queryKey: ['user_preference', 'dashboard_layout_gm_v4'] });
            setIsEditing(false);
        },
        onError: (error) => {
            addToast(`فشل حفظ التخطيط: ${error.message}`, 'error');
        }
    });

    const dashboardData = useMemo(() => {
        const logsThisWeek = dailyLogs.filter(l => isThisWeek(parseISO(l.date), { weekStartsOn: 0 }));
        const endDate = new Date();
        const startDate = subDays(endDate, 29);
        const rangeDays = eachDayOfInterval({ start: startDate, end: endDate });
        const productivityMap: Record<string, number> = {};
        rangeDays.forEach(day => { productivityMap[format(day, 'yyyy-MM-dd')] = 0; });
        dailyLogs.forEach(log => {
            if (productivityMap.hasOwnProperty(log.date)) productivityMap[log.date] += log.hours;
        });

        return {
            stats: {
                activeProjects: projects.filter(p => p.status === 'نشط').length,
                weeklyHours: logsThisWeek.reduce((sum, l) => sum + l.hours, 0),
                pendingItems: pendingItems.length,
                totalBudget: projects.reduce((sum, p) => sum + (p.budgetAmount || 0), 0),
            },
            dailyProductivity: Object.entries(productivityMap).map(([date, hours]) => ({ label: format(new Date(date), 'd MMM'), value: hours })),
            teamProductivity: teamMembers.map(member => ({
                label: member.name,
                value: logsThisWeek.filter(log => log.teamMemberId === member.id).reduce((sum, log) => sum + log.hours, 0)
            })).sort((a, b) => b.value - a.value).slice(0, 10),
        };
    }, [projects, dailyLogs, teamMembers, pendingItems]);

    const handleJoinMeeting = (meeting: Meeting) => onNavigate('meetingRoom', { meeting });
    
    const widgetMap: { [key: string]: React.ReactNode } = {
        'stats': <StatCardsWidget data={dashboardData.stats} currency={currency} onNavigate={onNavigate} />,
        'productivity': <CompanyProductivityWidget data={dashboardData.dailyProductivity} />,
        'projects': <ProjectOverviewWidget projects={projects} dailyLogs={dailyLogs} currency={currency} />,
        'team': <TeamProductivityWidget data={dashboardData.teamProductivity} />,
        'meetings': <UpcomingMeetingsWidget meetings={meetings} onJoin={handleJoinMeeting} />,
    };

    const handleToggleEdit = () => {
        if (isEditing) {
            saveLayoutMutation.mutate(layouts);
        } else {
            setIsEditing(true);
        }
    };

    return (
        <div className="p-6" dir="rtl">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">لوحة تحكم المدير العام</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">نظرة عامة على أداء المنظومة.</p>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse w-full sm:w-auto">
                    <button onClick={handleToggleEdit} disabled={saveLayoutMutation.isPending} className={`w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 ${isEditing ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600'}`}>
                        {saveLayoutMutation.isPending ? <LoadingSpinner /> : isEditing ? <CheckIcon className="w-5 h-5"/> : <WrenchScrewdriverIcon className="w-5 h-5" />}
                        <span>{saveLayoutMutation.isPending ? 'جارٍ الحفظ...' : isEditing ? 'حفظ التخطيط' : 'تخصيص اللوحة'}</span>
                    </button>
                    <button onClick={() => onNavigate('projects', { isModalOpen: true })} className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                        <PlusIcon className="w-5 h-5" /><span>مشروع جديد</span>
                    </button>
                </div>
            </div>

            <ResponsiveGridLayout
                className={`layout ${isEditing ? 'rgl-editing' : ''}`}
                layouts={layouts}
                onLayoutChange={(layout, allLayouts) => setLayouts(allLayouts)}
                breakpoints={{ lg: 1200, md: 996, sm: 768 }}
                cols={{ lg: 12, md: 12, sm: 6 }}
                rowHeight={60}
                isDraggable={isEditing}
                isResizable={isEditing}
            >
                {layouts.lg.map(item => (
                    <div key={item.i}>
                        {widgetMap[item.i] || <Card title="Widget not found" />}
                    </div>
                ))}
            </ResponsiveGridLayout>
        </div>
    );
};