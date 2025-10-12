import React, { useState, useMemo } from 'react';
import { Project, ProjectMember, ProjectRole } from '../../types';
import { useTeamContext } from '../../contexts/TeamContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { TrashIcon, UsersIcon } from '../ui/Icons';
import { useToast } from '../../contexts/ToastContext';

interface ProjectMembersProps {
    project: Project;
    canManageMembers: boolean;
}

export const ProjectMembers: React.FC<ProjectMembersProps> = ({ project, canManageMembers }) => {
    const { teamMembers } = useTeamContext();
    const { handleUpdateProject } = useProjectContext();
    const { addToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const projectMembers = useMemo(() => project.members || [], [project.members]);
    
    const availableMembersToAdd = useMemo(() => {
        const projectMemberIds = projectMembers.map(pm => pm.teamMemberId);
        return teamMembers.filter(tm => !projectMemberIds.includes(tm.id));
    }, [teamMembers, projectMembers]);

    const handleUpdateMembers = async (updatedMembers: ProjectMember[]) => {
        setIsSaving(true);
        try {
            await handleUpdateProject({ ...project, members: updatedMembers });
            addToast('تم تحديث فريق المشروع بنجاح.', 'success');
        } catch (error) {
            console.error("Failed to update project members:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddMember = (memberId: number, role: ProjectRole) => {
        if (projectMembers.some(pm => pm.teamMemberId === memberId)) {
            addToast('هذا العضو موجود بالفعل في المشروع.', 'info');
            return;
        }
        const newMember: ProjectMember = { teamMemberId: memberId, projectRole: role };
        handleUpdateMembers([...projectMembers, newMember]);
    };

    const handleRemoveMember = (memberIdToRemove: number) => {
        const updatedMembers = projectMembers.filter(pm => pm.teamMemberId !== memberIdToRemove);
        handleUpdateMembers(updatedMembers);
    };

    const handleRoleChange = (memberId: number, newRole: ProjectRole) => {
        const updatedMembers = projectMembers.map(pm => 
            pm.teamMemberId === memberId ? { ...pm, projectRole: newRole } : pm
        );
        handleUpdateMembers(updatedMembers);
    };

    const MemberRow: React.FC<{ projectMember: ProjectMember }> = ({ projectMember }) => {
        const member = teamMembers.find(tm => tm.id === projectMember.teamMemberId);
        if (!member) return null;

        return (
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full" />
                    <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{member.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{member.email}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                     <select 
                        value={projectMember.projectRole}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as ProjectRole)}
                        disabled={!canManageMembers || isSaving}
                        className="p-1 border border-slate-300 dark:border-slate-600 rounded-md text-xs bg-white dark:bg-slate-700 disabled:opacity-70"
                     >
                        <option value="Manager">مدير</option>
                        <option value="Member">عضو</option>
                    </select>
                    {canManageMembers && (
                         <button onClick={() => handleRemoveMember(member.id)} disabled={isSaving} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full disabled:opacity-50">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const AddMemberForm: React.FC = () => {
        const [selectedMemberId, setSelectedMemberId] = useState('');
        const [selectedRole, setSelectedRole] = useState<ProjectRole>('Member');

        const handleAdd = () => {
            if (!selectedMemberId) {
                addToast('الرجاء اختيار عضو لإضافته.', 'error');
                return;
            }
            handleAddMember(Number(selectedMemberId), selectedRole);
            setSelectedMemberId('');
            setSelectedRole('Member');
        };

        return (
            <div className="flex flex-col sm:flex-row items-center gap-2 p-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-md">
                <select value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)} className="w-full sm:w-1/2 p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200">
                    <option value="" disabled>-- اختر عضو --</option>
                    {availableMembersToAdd.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select value={selectedRole} onChange={e => setSelectedRole(e.target.value as ProjectRole)} className="w-full sm:w-1/4 p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200">
                    <option value="Manager">مدير</option>
                    <option value="Member">عضو</option>
                </select>
                 <button onClick={handleAdd} disabled={isSaving} className="w-full sm:w-auto flex-grow px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                    إضافة عضو
                </button>
            </div>
        )
    };

    return (
        <Card title="فريق المشروع" icon={<UsersIcon className="w-5 h-5"/>}>
            <div className="space-y-3">
                {projectMembers.map(pm => <MemberRow key={pm.teamMemberId} projectMember={pm} />)}
                
                {projectMembers.length === 0 && (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-4">لم يتم إضافة أعضاء لهذا المشروع بعد.</p>
                )}

                {canManageMembers && availableMembersToAdd.length > 0 && <AddMemberForm />}
            </div>
        </Card>
    );
};
