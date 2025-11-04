import React, { useState, useMemo } from 'react';
import { Project, TeamMember, ProjectRole } from '../../types';
import { useTeamContext } from '../../contexts/TeamContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { TrashIcon } from '../ui/Icons';

interface ProjectMembersProps {
  project: Project;
  canManageMembers: boolean;
}

export const ProjectMembers: React.FC<ProjectMembersProps> = ({ project, canManageMembers }) => {
    const { teamMembers } = useTeamContext();
    const { handleUpdateProject } = useProjectContext();
    const [newMemberId, setNewMemberId] = useState('');
    const [newMemberRole, setNewMemberRole] = useState<ProjectRole>('Member');

    const projectMembersDetails = useMemo(() => {
        return (project.members || [])
            .map(m => teamMembers.find(tm => tm.id === m.teamMemberId))
            .filter((m): m is TeamMember => !!m);
    }, [project.members, teamMembers]);

    const availableTeamMembers = useMemo(() => {
        const projectMemberIds = new Set(project.members?.map(m => m.teamMemberId));
        return teamMembers.filter(tm => !projectMemberIds.has(tm.id));
    }, [teamMembers, project.members]);

    const handleAddMember = async () => {
        if (!newMemberId) return;
        const updatedMembers = [...(project.members || []), { teamMemberId: Number(newMemberId), projectRole: newMemberRole }];
        await handleUpdateProject({ id: project.id, members: updatedMembers });
        setNewMemberId('');
    };

    const handleRemoveMember = async (memberId: number) => {
        if (memberId === project.creatorId) {
            alert("لا يمكن إزالة منشئ المشروع.");
            return;
        }
        const updatedMembers = (project.members || []).filter(m => m.teamMemberId !== memberId);
        await handleUpdateProject({ id: project.id, members: updatedMembers });
    };

    return (
        <Card title="أعضاء المشروع">
            <div className="space-y-3">
                {projectMembersDetails.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                            <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full" />
                            <div>
                                <p className="font-semibold text-sm">{member.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{project.members?.find(m => m.teamMemberId === member.id)?.projectRole}</p>
                            </div>
                        </div>
                        {canManageMembers && member.id !== project.creatorId && (
                            <button onClick={() => handleRemoveMember(member.id)} className="p-1 text-red-500 hover:text-red-700">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {canManageMembers && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <h4 className="text-sm font-semibold">إضافة عضو جديد</h4>
                    <div className="flex space-x-2 rtl:space-x-reverse">
                        <select value={newMemberId} onChange={e => setNewMemberId(e.target.value)} className="flex-grow p-2 border rounded-md text-sm">
                            <option value="">-- اختر عضو --</option>
                            {availableTeamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <select value={newMemberRole} onChange={e => setNewMemberRole(e.target.value as ProjectRole)} className="p-2 border rounded-md text-sm">
                            <option value="Member">Member</option>
                            <option value="Manager">Manager</option>
                        </select>
                    </div>
                    <button onClick={handleAddMember} disabled={!newMemberId} className="w-full px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">إضافة</button>
                </div>
            )}
        </Card>
    );
};
