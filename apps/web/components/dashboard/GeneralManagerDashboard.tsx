import React, { useMemo, useState, useEffect } from 'react';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import { Card } from '../ui/Card';
import { BarChart, LineChart } from '../ui/Charts';
import { FolderIcon, ClockIcon, BellIcon, CurrencyDollarIcon, PlusIcon, CheckIcon, WrenchScrewdriverIcon, XMarkIcon } from '../ui/Icons';
import { Project, Meeting, Task } from '@shared/types';
import { isThisWeek, parseISO, eachDayOfInterval, subDays, format } from 'date-fns';
import { UpcomingMeetingsCard } from './UpcomingMeetingsCard';
import { useNavigation } from '../../contexts/NavigationContext';
import { usePendingApprovals } from '@shared/hooks/usePendingApprovals';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { StatusBadge } from '../ui/StatusBadge';
import { StatCard } from './StatCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Responsive, WidthProvider, Layouts, Layout } from 'react-grid-layout';
import { useAuth } from '@shared/contexts/AuthContext';
import { useToast } from '@shared/contexts/ToastContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const ResponsiveGridLayout = WidthProvider(Responsive);

const areLayoutsEqual = (a: Layouts, b: Layouts): boolean => {
    if (!a || !b) return a === b;
    const breakpoints = ['lg', 'md', 'sm'];
    for (const bp of breakpoints) {
        const key = bp as keyof Layouts;
        const layoutA = a[key] || [];
        const layoutB = b[key] || [];
        if (layoutA.length !== layoutB.length) return false;

        // FIX: Corrected the type annotation for 'item' from 'Layout[0]' to 'Layout'.
        const layoutBMap = new Map(layoutB.map((item: Layout) => [item.i, item]));

        for (const itemA of layoutA) {
            const itemB = layoutBMap.get(itemA.i);
            if (!itemB) return false;
            if (itemA.x !== itemB.x || itemA.y !== itemB.y || itemA.w !== itemB.w || itemA.h !== itemB.h) {
                return false;
            }
        }
    }
    return true;
};


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
    <Card title="إنتاجية الشركة (آخر 30 يوم)"><LineChart data={data} /></Card>
);

const ProjectOverviewWidget: React.FC<{ projects: Project[]; dailyLogs: any[]; currency: string; }> = ({ projects, dailyLogs, currency }) => (
    <Card title="نظرة عامة على المشاريع النشطة">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
                <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-700/50"><tr>
                    <th className="px-4 py-2">المشروع</th><th className="px-4 py-2">الحالة</th><th className="px-4 py-2">تقدم الساعات</th><th className="px-4 py-2">التكلفة</th>
                </tr></thead>
                <tbody>
                    {projects.filter(p => p.status === 'نشط').slice(0, 5).map(p => {
                        const hours = dailyLogs.filter(l => l.projectId === p.id).reduce((s, l) => s + l.hours, 0);
                        return (
                            <tr key={p.id} className="border-b dark:border-slate-700">
                                <td className="px-4 py-2 font-medium">{p.name}</td>
                                <td className="px-4 py-2"><StatusBadge status={p.status} type="project" /></td>
                                <td className="px-4 py-2">{hours.toFixed(1)} / {p.budgetHours || '∞'}</td>
                                <td className="px-4 py-2">{p.budgetAmount?.toLocaleString() || '-'} {currency}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    </Card>
);

const TeamProductivityWidget: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => (
    <Card title="أداء أفضل 10 موظفين (الأسبوع)"><BarChart title="" data={data} /></Card>
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
    
    const { data: meetings = [] } = useQuery<Meeting[]>({ 
        queryKey: ['meetings'], 
        queryFn: () => api.getAll(supabaseClient!, 'meetings'), 
        enabled: !!supabaseClient,
        staleTime: 5 * 60 * 1000,
    });
    const { data: projects = [] } = useQuery<Project[]>({ 
        queryKey: ['projects'], 
        queryFn: () => api.getAll(supabaseClient!, 'projects'), 
        enabled: !!supabaseClient,
        staleTime: 5 * 60 * 1000,
    });

    const defaultLayouts: Layouts = {
        lg: [
            { i: 'stats', x: 0, y: 0, w: 12, h: 1 },
            { i: 'productivity', x: 0, y: 1, w: 8, h: 4 },
            { i: 'team', x: 8, y: 1, w: 4, h: 6 },
            { i: 'projects', x: 0, y: 5, w: 8, h: 4 },
            { i: 'meetings', x: 8, y: 7, w: 4, h: 2 },
        ],
        md: [
            { i: 'stats', x: 0, y: 0, w: 12, h: 1 },
            { i: 'productivity', x: 0, y: 1, w: 12, h: 4 },
            { i: 'team', x: 0, y: 5, w: 6, h: 5 },
            { i: 'projects', x: 0, y: 10, w: 12, h: 4 },
            { i: 'meetings', x: 6, y: 5, w: 6, h: 5 },
        ],
        sm: [
            { i: 'stats', x: 0, y: 0, w: 6, h: 2 },
            { i: 'productivity', x: 0, y: 2, w: 6, h: 4 },
            { i: 'team', x: 0, y: 6, w: 6, h: 5 },
            { i: 'projects', x: 0, y: 11, w: 6, h: 4 },
            { i: 'meetings', x: 0, y: 15, w: 6, h: 4 },
        ]
    };

    const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);
    const [layoutsAtEditStart, setLayoutsAtEditStart] = useState<Layouts | null>(null);

    const { data: savedLayouts } = useQuery({
        queryKey: ['user_preference', 'dashboard_layout_gm'],
        queryFn: () => api.getUserPreference<Layouts>(supabaseClient!, currentUser!.id, 'dashboard_layout_gm'),
        enabled: !!supabaseClient && !!currentUser,
    });

    useEffect(() => {
        if (savedLayouts && !isEditing) {
            const newLayouts: Layouts = { lg: [], md: [], sm: [] };
            for (const breakpoint of ['lg', 'md', 'sm']) {
                const bp = breakpoint as keyof Layouts;
                const defaultItems = defaultLayouts[bp];
                const savedItems = savedLayouts[bp] || [];
                const savedItemsMap = new Map(savedItems.map(item => [item.i, item]));
                newLayouts[bp] = defaultItems.map(defaultItem => savedItemsMap.get(defaultItem.i) || defaultItem);
            }
            setLayouts(newLayouts);
        }
    }, [savedLayouts, isEditing]);

    const isDirty = useMemo(() => {
        if (!isEditing || !layoutsAtEditStart) return false;
        return !areLayoutsEqual(layouts, layoutsAtEditStart);
    }, [isEditing, layouts, layoutsAtEditStart]);


    const saveLayoutMutation = useMutation({
        mutationFn: (newLayouts: Layouts) => api.setUserPreference(supabaseClient!, currentUser!.id, 'dashboard_layout_gm', newLayouts),
        onSuccess: () => {
            addToast('تم حفظ تخطيط اللوحة بنجاح.', 'success');
            setIsEditing(false);
            setLayoutsAtEditStart(null);
            queryClient.invalidateQueries({ queryKey: ['user_preference', 'dashboard_layout_gm'] });
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

    const handleSaveLayout = () => {
        if (isDirty) {
            saveLayoutMutation.mutate(layouts);
        }
    };
    
    const handleStartEditing = () => {
        setLayoutsAtEditStart(layouts);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        if(layoutsAtEditStart) setLayouts(layoutsAtEditStart);
        setIsEditing(false);
        setLayoutsAtEditStart(null);
    };

    return (
        <div className="p-6" dir="rtl">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">لوحة تحكم المدير العام</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">نظرة عامة على أداء المنظومة.</p>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse w-full sm:w-auto">
                     {isEditing ? (
                        <>
                            <button onClick={handleCancelEdit} className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600">
                                <XMarkIcon className="w-5 h-5"/>
                                <span>إلغاء</span>
                            </button>
                             <button 
                                onClick={handleSaveLayout} 
                                disabled={!isDirty || saveLayoutMutation.isPending} 
                                title={!isDirty ? "No changes to save" : "حفظ التخطيط"}
                                className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed">
                                {saveLayoutMutation.isPending ? <LoadingSpinner /> : <CheckIcon className="w-5 h-5"/>}
                                <span>حفظ التخطيط</span>
                            </button>
                        </>
                    ) : (
                         <button onClick={handleStartEditing} className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600">
                            <WrenchScrewdriverIcon className="w-5 h-5" />
                            <span>تخصيص اللوحة</span>
                        </button>
                    )}
                    <button onClick={() => onNavigate('projects', { isModalOpen: true })} className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                        <PlusIcon className="w-5 h-5" /><span>مشروع جديد</span>
                    </button>
                </div>
            </div>

            <ResponsiveGridLayout
                className={`layout ${isEditing ? 'rgl-editing' : ''}`}
                layouts={layouts}
                onLayoutChange={(layout, allLayouts) => {
                    if (isEditing) {
                        setLayouts(allLayouts);
                    }
                }}
                breakpoints={{ lg: 1200, md: 996, sm: 768 }}
                cols={{ lg: 12, md: 12, sm: 6 }}
                rowHeight={60}
                isDraggable={isEditing}
                isResizable={isEditing}
            >
                {(layouts.lg || []).map(item => (
                    <div key={item.i}>
                        {widgetMap[item.i] || <Card title="Widget not found" />}
                    </div>
                ))}
            </ResponsiveGridLayout>
        </div>
    );
};
