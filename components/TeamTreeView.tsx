import React, { useMemo, useState } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { TeamMember, TeamMemberFormData } from '../../types';
import { UserPlusIcon } from '../ui/Icons';
import { Card } from '../ui/Card';
import { TeamMemberFormModal } from '../modals/TeamMemberFormModal';

interface TreeNodeProps {
  member: TeamMember;
  allMembers: TeamMember[];
  onSelect: (memberId: number) => void;
  level: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ member, allMembers, onSelect, level }) => {
  const children = useMemo(() => {
    return allMembers.filter(child => child.reportsTo === member.id);
  }, [allMembers, member.id]);
  
  const { rolesMap } = useAuth();
  const roleName = rolesMap[member.roleId]?.name || member.roleId;

  return (
    <div style={{ marginRight: `${level * 20}px` }} className="my-2 rtl:mr-0 rtl:ml-5">
      <div 
        onClick={() => onSelect(member.id)}
        className="flex items-center space-x-3 rtl:space-x-reverse p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        <img src={member.avatarUrl} alt={member.name} className="w-12 h-12 rounded-full" />
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{member.name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{roleName}</p>
        </div>
      </div>
      {children.length > 0 && (
        <div className="pr-6 rtl:pr-0 rtl:pl-6 border-r-2 rtl:border-r-0 rtl:border-l-2 border-slate-200 dark:border-slate-600">
          {children.map(child => (
            <TreeNode key={child.id} member={child} allMembers={allMembers} onSelect={onSelect} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

interface TeamTreeViewProps {
    onSelectMember: (memberId: number) => void;
}

export const TeamTreeView: React.FC<TeamTreeViewProps> = ({ onSelectMember }) => {
    const { teamMembers, handleAddMember, handleUpdateMember } = useAppDataContext();
    const { hasPermission } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

    const rootMembers = useMemo(() => {
        return teamMembers.filter(m => !m.reportsTo);
    }, [teamMembers]);

    const handleSaveMember = async (memberData: TeamMemberFormData, isNew: boolean) => {
        if (isNew) {
            await handleAddMember(memberData);
        } else if (editingMember) {
            await handleUpdateMember(editingMember.id, memberData);
        }
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">الفريق</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">الهيكل التنظيمي للفريق.</p>
                </div>
                {hasPermission('manage_team') && (
                    <button onClick={() => { setEditingMember(null); setIsModalOpen(true); }} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 w-full md:w-auto">
                        <UserPlusIcon className="w-5 h-5"/><span>إضافة عضو جديد</span>
                    </button>
                )}
            </div>

            <Card>
                {rootMembers.map(member => (
                    <TreeNode key={member.id} member={member} allMembers={teamMembers} onSelect={onSelectMember} level={0} />
                ))}
            </Card>
            
            {isModalOpen && (
                <TeamMemberFormModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveMember}
                    member={editingMember}
                />
            )}
        </div>
    );
};