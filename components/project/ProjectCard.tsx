import React, { useMemo } from 'react';
import { Project } from '../../types';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { ExclamationTriangleIcon } from '../ui/Icons';
import { StatusBadge } from '../ui/StatusBadge';

interface ProjectCardProps {
  project: Project;
  onSelect: (projectId: string) => void;
  currency: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = React.memo(({ project, onSelect, currency }) => {
    const { dailyLogs } = useTimeLogContext();
    const hoursLogged = useMemo(() => dailyLogs.filter(log => log.projectId === project.id).reduce((sum, log) => sum + log.hours, 0), [dailyLogs, project.id]);
    
    const budgetUsage = project.budgetHours ? (hoursLogged / project.budgetHours) * 100 : 0;
    
    return (
        <div onClick={() => onSelect(project.id)} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3 cursor-pointer hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all">
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 pr-2">{project.name}</h3>
                <StatusBadge status={project.status} type="project" />
            </div>

            <div>
                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>تقدم الميزانية (ساعات)</span>
                    <span>{budgetUsage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                        className={`h-2 rounded-full ${budgetUsage > 90 ? 'bg-red-500' : 'bg-sky-500'}`}
                        style={{ width: `${Math.min(budgetUsage, 100)}%` }}
                    ></div>
                </div>
                {project.budgetNotificationSent && (
                    <div className="flex items-center space-x-1 rtl:space-x-reverse text-amber-600 dark:text-amber-400 text-xs mt-2">
                        <ExclamationTriangleIcon className="w-4 h-4" title={`تم إرسال إشعار بتجاوز ${project.budgetNotificationSent}% من الميزانية`} />
                        <span>تجاوز الميزانية</span>
                    </div>
                )}
            </div>

            <div className="flex justify-between text-sm border-t border-slate-200 dark:border-slate-700 pt-3 text-slate-600 dark:text-slate-300">
                <div>
                    <span className="font-semibold">{hoursLogged.toFixed(1)}</span>
                    <span className="text-xs"> / {project.budgetHours || '∞'} ساعة</span>
                </div>
                {project.budgetAmount && (
                    <div>
                        <span className="font-semibold">{project.budgetAmount.toLocaleString()}</span>
                        <span className="text-xs"> {currency}</span>
                    </div>
                )}
            </div>
        </div>
    );
});