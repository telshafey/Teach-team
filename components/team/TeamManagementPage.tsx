import React, { useState, useMemo, useCallback } from 'react';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { TeamMember, Role, TeamMemberFormData } from '@shared/types';
import { Card } from '../ui/Card';
import { TeamOrgChart } from './TeamOrgChart';
import { TeamMemberDetailPage } from './TeamMemberDetailPage';
import { TeamMemberForm } from './TeamMemberForm';
import { PlusIcon } from '../ui/Icons';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '@shared/contexts/ToastContext';

interface TeamManagementPageProps {
  initialMemberId?: number;
}

export const TeamManagementPage: React.FC<TeamManagementPageProps> = ({ initialMemberId }) => {
  const { teamMembers: allTeamMembers, roles, handleAddMember, handleUpdateMember, handleDeleteMember, hasPermission, visibleMemberIds } = useTeamContext();
  const { addToast } = useToast();

  const visibleTeamMembers = useMemo(() => {
    return allTeamMembers.filter(m => visibleMemberIds.has(m.id));
  }, [allTeamMembers, visibleMemberIds]);
  
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(initialMemberId || (visibleTeamMembers.length > 0 ? visibleTeamMembers.find(m => !m.reportsTo)?.id ?? visibleTeamMembers[0].id : null));
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const canManageTeam = hasPermission('manage_team');
  const canEditMembers = hasPermission('edit_team_members');

  const selectedMember = useMemo(() => {
    return allTeamMembers.find(m => m.id === selectedMemberId);
  }, [allTeamMembers, selectedMemberId]);

  const selectedMemberRole = useMemo(() => {
    if (!selectedMember) return undefined;
    return roles.find(r => r.id === selectedMember.roleId);
  }, [roles, selectedMember]);

  const selectedMemberManager = useMemo(() => {
    if (!selectedMember || !selectedMember.reportsTo) return undefined;
    return allTeamMembers.find(m => m.id === selectedMember.reportsTo);
  }, [allTeamMembers, selectedMember]);

  const handleSaveMember = useCallback(async (formData: TeamMemberFormData, memberToUpdate: TeamMember | null) => {
    if (memberToUpdate) {
      await handleUpdateMember(memberToUpdate.id, formData);
    } else {
      await handleAddMember(formData);
    }
    setViewMode('list');
  }, [handleAddMember, handleUpdateMember]);
  
  const handleOpenEditModal = useCallback((member: TeamMember) => {
      setEditingMember(member);
      setViewMode('form');
  }, []);

  const handleDeleteMemberClick = useCallback(async (memberId: number) => {
      await handleDeleteMember(memberId);
      if (selectedMemberId === memberId) {
          setSelectedMemberId(null);
      }
  }, [handleDeleteMember, selectedMemberId]);

  const openAddModal = useCallback(() => {
      setEditingMember(null);
      setViewMode('form');
  }, []);
  
  const handleMoveMember = useCallback(async (memberId: number, newManagerId: number | null) => {
      await handleUpdateMember(memberId, { reportsTo: newManagerId });
      addToast('تم تحديث الهيكل التنظيمي بنجاح.', 'success');
  }, [handleUpdateMember, addToast]);

  if (viewMode === 'form') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <TeamMemberForm 
           member={editingMember}
           onSave={handleSaveMember}
           onCancel={() => setViewMode('list')}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">إدارة الفريق</h2>
                <p className="text-md text-slate-500 dark:text-slate-400">عرض وإدارة أعضاء الفريق والهيكل التنظيمي.</p>
            </div>
            {canManageTeam && (
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={openAddModal} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                        <PlusIcon className="w-5 h-5"/><span>إضافة عضو جديد</span>
                    </button>
                </div>
            )}
        </div>
        <div className="space-y-6">
            <div>
                <Card title="الهيكل التنظيمي">
                    <TeamOrgChart 
                        members={visibleTeamMembers} 
                        onMemberClick={setSelectedMemberId} 
                        selectedMemberId={selectedMemberId}
                        onMoveMember={handleMoveMember}
                        canManage={canManageTeam}
                    />
                </Card>
            </div>
            <div>
                {selectedMember ? (
                    <TeamMemberDetailPage 
                        member={selectedMember} 
                        role={selectedMemberRole} 
                        manager={selectedMemberManager} 
                        onEdit={handleOpenEditModal}
                        onDelete={canManageTeam ? handleDeleteMemberClick : undefined}
                        canEdit={canManageTeam || canEditMembers}
                    />
                ) : (
                    <Card>
                        <EmptyState title="اختر عضو فريق" message="اختر عضوًا من القائمة لعرض تفاصيله." />
                    </Card>
                )}
            </div>
        </div>
    </div>
  );
};
