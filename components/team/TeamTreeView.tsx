import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TeamMember } from '../../types';
import { UserPlusIcon } from '../ui/Icons';
import { Card } from '../ui/Card';
import { useAppDataContext } from '../../contexts/DataContext';

interface TreeNodeProps {
  member: TeamMember;
  allMembers: TeamMember[];
  onSelect: (memberId: number) => void;
  selectedMemberId: number | null;
  level: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ member, allMembers, onSelect, selectedMemberId, level }) => {
  const children = allMembers.filter(child => child.reportsTo === member.id);
  
  const { rolesMap, hasPermission } = useAuth();
  const { currency } = useAppDataContext();
  const roleName = rolesMap[member.roleId]?.name || member.roleId;
  const isSelected = member.id === selectedMemberId;

  return (
    <div style={{ marginRight: `${level * 20}px` }} className="my-2 rtl:mr-0 rtl:ml-5">
      <div 
        onClick={() => onSelect(member.id)}
        className={`flex items-center space-x-3 rtl:space-x-reverse p-2 rounded-lg border shadow-sm cursor-pointer transition-colors
          ${isSelected 
            ? 'bg-sky-100 dark:bg-sky-900/50 border-sky-300 dark:border-sky-700' 
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
      >
        <img src={member.avatarUrl} alt={member.name} className="w-12 h-12 rounded-full" />
        <div>
          <p className={`font-semibold ${isSelected ? 'text-sky-800 dark:text-sky-200' : 'text-slate-800 dark:text-slate-200'}`}>{member.name}</p>
          <p className={`text-sm ${isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`}>{roleName}</p>
           {hasPermission('view_all_salaries') && (
            <>
              {member.salary != null && (
                <p className="text-xs text-green-700 dark:text-green-400 font-semibold mt-1">
                  {member.salary.toLocaleString()} {currency}/شهر
                </p>
              )}
              {member.hourlyRate != null && (
                <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold mt-1">
                  {member.hourlyRate.toLocaleString()} {currency}/ساعة
                </p>
              )}
            </>
          )}
        </div>
      </div>
      {children.length > 0 && (
        <div className="pr-6 rtl:pr-0 rtl:pl-6 border-r-2 rtl:border-r-0 rtl:border-l-2 border-slate-200 dark:border-slate-600">
          {children.map(child => (
            <TreeNode key={child.id} member={child} allMembers={allMembers} onSelect={onSelect} selectedMemberId={selectedMemberId} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

interface TeamTreeViewProps {
    rootMembers: TeamMember[];
    allMembers: TeamMember[];
    onSelectMember: (memberId: number) => void;
    onAddMember: () => void;
    selectedMemberId: number | null;
}

export const TeamTreeView: React.FC<TeamTreeViewProps> = ({ rootMembers, allMembers, onSelectMember, onAddMember, selectedMemberId }) => {
    const { hasPermission } = useAuth();

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">الفريق</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">الهيكل التنظيمي لفريقك.</p>
                </div>
                {hasPermission('manage_team') && (
                    <button onClick={onAddMember} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 w-full md:w-auto">
                        <UserPlusIcon className="w-5 h-5"/><span>إضافة عضو</span>
                    </button>
                )}
            </div>

            <Card>
                {rootMembers.map(member => (
                    <TreeNode key={member.id} member={member} allMembers={allMembers} onSelect={onSelectMember} selectedMemberId={selectedMemberId} level={0} />
                ))}
            </Card>
        </div>
    );
};
