import React, { useState, useMemo } from 'react';
import { Project, TeamMember, ProjectMember, ProjectRole } from '../../types';
import { useTeamContext } from '../../contexts/TeamContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { UsersIcon, PlusIcon, TrashIcon } from '../ui/Icons';
import { ConfirmationModal } from '../modals/ConfirmationModal';

interface ProjectMembersProps {
    project: Project;
    canManageMembers: boolean;
}

export const ProjectMembers: React.FC<ProjectMembersProps> = ({ project, canManageMembers }) => {
    const { teamMembers } = useTeamContext();
    const { handleUpdateProject } = useProjectContext();
    const [isAdding, setIsAdding] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null);

    const projectMembers = useMemo(() => {
        const members = project.members || [];
        return members.map(pm => {
            const memberDetails = teamMembers.find(tm => tm.id === pm.teamMemberId);
            return { ...pm, details: memberDetails };
        }).filter(m => m.details);
    }, [project.members, teamMembers]);

    const potentialMembersToAdd = useMemo(() => {
        const memberIdsInProject = new Set((project.members || []).map(m => m.teamMemberId));
        return teamMembers.filter(tm => !memberIdsInProject.has(tm.id));
    }, [project.members, teamMembers]);
    
    const handleAddMember = async (teamMemberId: number, projectRole: ProjectRole) => {
        const newMember: ProjectMember = { teamMemberId, projectRole };
        const updatedMembers = [...(project.members || []), newMember];
        await handleUpdateProject({ id: project.id, members: updatedMembers });
        setIsAdding(false);
    };

    const handleRemoveMember = async () => {
        if (!memberToRemove) return;
        const updatedMembers = (project.members || []).filter(m => m.teamMemberId !== memberToRemove.teamMemberId);
        await handleUpdateProject({ id: project.id, members: updatedMembers });
        setMemberToRemove(null);
    };

    const handleRoleChange = async (teamMemberId: number, newRole: ProjectRole) => {
        const updatedMembers = (project.members || []).map(m => 
            m.teamMemberId === teamMemberId ? { ...m, projectRole: newRole } : m
        );
        await handleUpdateProject({ id: project.id, members: updatedMembers });
    };

    return (
        <Card title="أعضاء فريق المشروع" icon={<UsersIcon className="w-5 h-5"/>}>
            <div className="space-y-4">
                {projectMembers.map(({ details, projectRole }) => (
                    <div key={details!.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                            <img src={details!.avatarUrl} alt={details!.name} className="w-10 h-10 rounded-full" />
                            <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{details!.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{details!.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <select 
                                value={projectRole} 
                                onChange={(e) => handleRoleChange(details!.id, e.target.value as ProjectRole)}
                                disabled={!canManageMembers}
                                className="bg-transparent border-0 rounded-md text-sm font-semibold text-slate-600 dark:text-slate-300 focus:ring-0 disabled:appearance-none"
                            >
                                <option value="Manager">مدير</option>
                                <option value="Member">عضو</option>
                            </select>
                            {canManageMembers && projectMembers.length > 1 && (
                                <button onClick={() => setMemberToRemove({ teamMemberId: details!.id, projectRole })} className="p-1 text-red-500 hover:text-red-700">
                                    <TrashIcon className="w-4 h-4"/>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {canManageMembers && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    {isAdding ? (
                         <div className="flex items-center space-x-2 rtl:space-x-reverse">
                             <select 
                                 onChange={(e) => handleAddMember(Number(e.target.value), 'Member')}
                                 className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                                 defaultValue=""
                             >
                                 <option value="" disabled>اختر عضواً لإضافته</option>
                                 {potentialMembersToAdd.map(tm => (
                                     <option key={tm.id} value={tm.id}>{tm.name}</option>
                                 ))}
                             </select>
                             <button onClick={() => setIsAdding(false)} className="p-2 text-sm text-slate-500">إلغاء</button>
                         </div>
                    ) : (
                         <button onClick={() => setIsAdding(true)} className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 text-sm font-semibold text-sky-700 bg-sky-100 rounded-md hover:bg-sky-200">
                             <PlusIcon className="w-4 h-4"/><span>إضافة عضو للمشروع</span>
                         </button>
                    )}
                </div>
            )}
            
            {memberToRemove && (
                <ConfirmationModal 
                    isOpen={!!memberToRemove}
                    onClose={() => setMemberToRemove(null)}
                    onConfirm={handleRemoveMember}
                    title="تأكيد إزالة العضو"
                    message={`هل أنت متأكد من رغبتك في إزالة هذا العضو من المشروع؟`}
                    isDestructive
                />
            )}
        </Card>
    );
};