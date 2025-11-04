import React, { useMemo, useState } from 'react';
import { useTeamContext } from '../../contexts/TeamContext';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { useRequestsContext } from '../../contexts/RequestsContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { Card } from '../ui/Card';
import { calculateProjectCostBreakdown } from '../../utils/costs';
import { ChevronDownIcon } from '../ui/Icons';
import { Project } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../../contexts/SupabaseContext';
import * as api from '../../services/apiService';

const ProjectFinancialsRow: React.FC<{ project: Project }> = ({ project }) => {
    const { teamMembers } = useTeamContext();
    const { dailyLogs } = useTimeLogContext();
    const { expenseClaims, overtimeRequests } = useRequestsContext();
    const { currency, siteSettings } = useSettingsContext();
    const [isOpen, setIsOpen] = useState(false);

    const costData = useMemo(() => {
        return calculateProjectCostBreakdown(project, teamMembers, dailyLogs, expenseClaims, overtimeRequests, siteSettings);
    }, [project, teamMembers, dailyLogs, expenseClaims, overtimeRequests, siteSettings]);

    return (
        <div className="border-b dark:border-slate-700">
            <div onClick={() => setIsOpen(!isOpen)} className="flex justify-between items-center p-4 cursor-pointer">
                <span className="font-semibold">{project.name}</span>
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <span className="font-bold text-lg">{costData.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}</span>
                    <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>
            {isOpen && (
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 text-sm space-y-2">
                    <div className="flex justify-between"><span className="text-slate-500">تكلفة الموظفين:</span><span>{costData.employeeCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">تكلفة المستقلين:</span><span>{costData.freelancerCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">تكلفة المصروفات:</span><span>{costData.expenseCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">تكلفة الساعات الإضافية:</span><span>{costData.overtimeCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</span></div>
                </div>
            )}
        </div>
    );
};


export const ProjectFinancials: React.FC = () => {
    const { supabaseClient } = useSupabase();
    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: () => api.getAll<Project>(supabaseClient!, 'projects'),
        enabled: !!supabaseClient,
    });

    return (
        <Card>
            <div>
                {projects.map(project => (
                    <ProjectFinancialsRow key={project.id} project={project} />
                ))}
            </div>
        </Card>
    );
};
