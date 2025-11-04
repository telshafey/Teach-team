import React, { useMemo, useState } from 'react';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useTeamContext } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Project, TeamMember, FreelancerContract, BillingProposalFormData } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { FreelancerBillingModal } from '../modals/FreelancerBillingModal';
import { FreelancerContractModal } from '../modals/AssignFreelancerModal';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../../contexts/SupabaseContext';
import * as api from '../../services/apiService';

interface FreelancerContractsTabProps {
    onReview: (project: Project) => void;
}

export const FreelancerContractsTab: React.FC<FreelancerContractsTabProps> = ({ onReview }) => {
    const { handleUpdateProject } = useProjectContext();
    const { teamMembers, hasPermission } = useTeamContext();
    const { currentUser } = useAuth();
    const { currency } = useSettingsContext();
    const { supabaseClient } = useSupabase();

    const [billingProject, setBillingProject] = useState<Project | null>(null);
    const [assigningProject, setAssigningProject] = useState<Project | null>(null);

    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: () => api.getAll<Project>(supabaseClient!, 'projects'),
        enabled: !!supabaseClient,
    });

    const isFreelancer = currentUser?.roleId === 'freelancer';
    const canManageContracts = hasPermission('approve_freelancer_contracts');

    const contractsToDisplay = useMemo(() => {
        if (isFreelancer) {
            return projects.filter(p => p.members?.some(m => m.teamMemberId === currentUser.id));
        }
        if (canManageContracts) {
            return projects.filter(p => p.freelancerContract);
        }
        return [];
    }, [projects, currentUser, isFreelancer, canManageContracts]);

    const membersMap = useMemo(() => teamMembers.reduce((acc, m) => ({ ...acc, [m.id]: m.name }), {} as Record<number, string>), [teamMembers]);

    const handleSaveProposal = async (proposal: BillingProposalFormData) => {
        if (!billingProject) return;
        const newContract: FreelancerContract = {
            ...proposal,
            freelancerId: currentUser!.id,
            status: 'pending',
        };
        await handleUpdateProject({ id: billingProject.id, freelancerContract: newContract });
    };
    
    const handleSaveAssignment = async (contractData: Omit<FreelancerContract, 'status' | 'notes'>) => {
        if (!assigningProject) return;
        const newContract: FreelancerContract = {
            ...contractData,
            status: 'approved',
        };
        await handleUpdateProject({ id: assigningProject.id, freelancerContract: newContract, members: [{teamMemberId: contractData.freelancerId, projectRole: 'Member'}] });
    };

    return (
        <Card>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                     <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                        <tr>
                            <th className="px-4 py-2">المشروع</th>
                            {!isFreelancer && <th className="px-4 py-2">المستقل</th>}
                            <th className="px-4 py-2">نوع العقد</th>
                            <th className="px-4 py-2">القيمة</th>
                            <th className="px-4 py-2">الحالة</th>
                            <th className="px-4 py-2">الإجراء</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contractsToDisplay.map(project => {
                            const contract = project.freelancerContract;
                            let value = '-';
                            if(contract?.type === 'fixed') value = `${contract.amount} ${currency}`;
                            if(contract?.type === 'hourly') value = `${contract.hourlyRate} ${currency}/ساعة`;
                            if(contract?.type === 'per-task') value = `بالقطعة`;
                            
                            return (
                                <tr key={project.id} className="border-b dark:border-slate-700">
                                    <td className="px-4 py-2 font-medium">{project.name}</td>
                                    {!isFreelancer && <td className="px-4 py-2">{contract ? membersMap[contract.freelancerId] : '-'}</td>}
                                    <td className="px-4 py-2">{contract?.type || '-'}</td>
                                    <td className="px-4 py-2">{contract ? value : '-'}</td>
                                    <td className="px-4 py-2">{contract ? <StatusBadge status={contract.status} type="contract"/> : <span className="text-xs text-slate-500">لم يتم التعيين</span>}</td>
                                    <td className="px-4 py-2">
                                        {isFreelancer && !contract && <button onClick={() => setBillingProject(project)} className="text-xs font-semibold text-sky-600">اقتراح عقد</button>}
                                        {canManageContracts && !contract && <button onClick={() => setAssigningProject(project)} className="text-xs font-semibold text-sky-600">تعيين عقد</button>}
                                        {canManageContracts && contract?.status === 'pending' && <button onClick={() => onReview(project)} className="text-xs font-semibold text-amber-600">مراجعة</button>}
                                        {canManageContracts && contract?.status === 'approved' && <button onClick={() => setAssigningProject(project)} className="text-xs font-semibold text-slate-500">تعديل</button>}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                 {contractsToDisplay.length === 0 && <p className="text-center text-slate-500 py-8">لا توجد عقود لعرضها.</p>}
            </div>
            {billingProject && <FreelancerBillingModal isOpen={!!billingProject} onClose={() => setBillingProject(null)} onSave={handleSaveProposal} project={billingProject} />}
            {assigningProject && <FreelancerContractModal isOpen={!!assigningProject} onClose={() => setAssigningProject(null)} onSave={handleSaveAssignment} project={assigningProject} />}
        </Card>
    );
};
