import React, { useMemo, useState } from 'react';
import { TeamMember } from '../../types';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { UserIcon, ClockIcon, SparklesIcon, PencilIcon } from '../ui/Icons';
import { BarChart } from '../ui/Charts';
import { generatePerformanceNotes } from '../../services/geminiService';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import { useNavigation } from '../../contexts/NavigationContext';

interface TeamMemberDetailPageProps {
  member: TeamMember;
  onBack: () => void;
  onEdit: () => void;
}

export const TeamMemberDetailPage: React.FC<TeamMemberDetailPageProps> = ({ member, onBack, onEdit }) => {
  const { onNavigate } = useNavigation();
  const { dailyLogs } = useTimeLogContext();
  const { currency } = useSettingsContext();
  const { tasks, projects } = useProjectContext();
  const { rolesMap, hasPermission } = useAuth();
  const { addToast } = useToast();
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [performanceNotes, setPerformanceNotes] = useState('');

  const role = rolesMap[member.roleId];

  const memberLogs = useMemo(() => dailyLogs.filter(l => l.teamMemberId === member.id), [dailyLogs, member.id]);
  const memberTasks = useMemo(() => tasks.filter(t => t.assignedTo === member.id), [tasks, member.id]);

  const totalHoursLogged = useMemo(() => memberLogs.reduce((sum, l) => sum + l.hours, 0), [memberLogs]);
  const tasksCompleted = useMemo(() => memberTasks.filter(t => t.status === 'done').length, [memberTasks]);
  
  const hoursByProject = useMemo(() => {
    const projectsMap = projects.reduce((acc, p) => {
      acc[p.id] = p.name;
      return acc;
    }, {} as Record<string, string>);

    const data = memberLogs.reduce((acc: Record<string, number>, log) => {
      const projectName = log.projectId ? (projectsMap[log.projectId] || log.projectId) : 'مهام أخرى';
      acc[projectName] = (acc[projectName] || 0) + log.hours;
      return acc;
    }, {});
    
    return Object.entries(data).map(([label, value]: [string, number]) => ({ label, value }));
  }, [memberLogs, projects]);

  const handleGenerateNotes = async () => {
    setIsGeneratingNotes(true);
    setPerformanceNotes('');
    try {
        const recentLogs = memberLogs.slice(-20); // Get most recent 20 logs
        const notes = await generatePerformanceNotes(
          member.name,
          memberTasks.map(t => ({ title: t.title, status: t.status })),
          recentLogs.map(l => ({ hours: l.hours, description: l.description }))
        );
        setPerformanceNotes(notes);
    } catch (error) {
        console.error("Error generating notes:", error);
        addToast("حدث خطأ أثناء إنشاء ملخص الأداء. يرجى المحاولة مرة أخرى.", "error");
    } finally {
        setIsGeneratingNotes(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <button onClick={onBack} className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 mb-2">&larr; العودة للفريق</button>
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <img src={member.avatarUrl} alt={member.name} className="w-16 h-16 rounded-full ring-2 ring-white dark:ring-slate-700 shadow" />
          <div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{member.name}</h2>
                {hasPermission('edit_team_members') && (
                    <button onClick={onEdit} className="p-1 text-slate-500 hover:text-sky-600 dark:hover:text-sky-400">
                        <PencilIcon className="w-5 h-5"/>
                    </button>
                )}
            </div>
            <p className="text-md text-slate-500 dark:text-slate-400">{role?.name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card title="معلومات أساسية" icon={<UserIcon className="w-5 h-5"/>}>
            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex justify-between"><span>إجمالي الساعات المسجلة:</span> <span className="font-bold">{totalHoursLogged.toFixed(1)}</span></div>
                <div className="flex justify-between"><span>المهام المكتملة:</span> <span className="font-bold">{tasksCompleted}</span></div>
                <div className="flex justify-between"><span>إجمالي المهام:</span> <span className="font-bold">{memberTasks.length}</span></div>
                
                {hasPermission('view_all_salaries') && (
                    <>
                        <div className="border-t border-slate-200 dark:border-slate-600 my-2"></div>
                        {member.salary != null && (
                            <div className="flex justify-between"><span>الراتب الشهري:</span> <span className="font-bold text-green-600 dark:text-green-400">{member.salary.toLocaleString()} {currency}</span></div>
                        )}
                        {member.hourlyRate != null && (
                            <div className="flex justify-between"><span>سعر الساعة:</span> <span className="font-bold text-indigo-600 dark:text-indigo-400">{member.hourlyRate.toLocaleString()} {currency}</span></div>
                        )}
                        {member.weeklyHoursRequirement != null && (
                            <div className="flex justify-between"><span>ساعات العمل الأسبوعية:</span> <span className="font-bold">{member.weeklyHoursRequirement} ساعة</span></div>
                        )}
                    </>
                )}
            </div>
          </Card>
           {hasPermission('use_ai_features') && (
            <Card title="ملاحظات الأداء (AI)" icon={<SparklesIcon className="w-5 h-5"/>}>
              <div className="space-y-3">
                <button 
                  onClick={handleGenerateNotes} 
                  disabled={isGeneratingNotes}
                  className="w-full px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400 flex justify-center items-center transition-colors"
                  aria-live="polite"
                >
                  {isGeneratingNotes ? <LoadingSpinner /> : 'إنشاء ملخص الأداء'}
                </button>
                {performanceNotes && (
                    <div className="p-3 border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                        {performanceNotes}
                    </div>
                )}
              </div>
            </Card>
           )}
        </div>
        <div className="md:col-span-2">
            <Card title="توزيع ساعات العمل على المشاريع" icon={<ClockIcon className="w-5 h-5"/>}>
                <BarChart title="" data={hoursByProject} />
            </Card>
        </div>
      </div>
    </div>
  );
};
