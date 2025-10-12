import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { TeamMember } from '../../types';
import { Card } from '../ui/Card';

interface TreeNodeProps {
  member: TeamMember;
  allMembers: TeamMember[];
  onSelect: (memberId: number) => void;
  selectedMemberId: number | null;
  level: number;
  visited: Set<number>; // Pass down the set of visited nodes in the current path
}

const TreeNode: React.FC<TreeNodeProps> = ({ member, allMembers, onSelect, selectedMemberId, level, visited }) => {
  // Prevent infinite loops from circular dependencies in data
  if (visited.has(member.id)) {
    return (
        <div style={{ marginRight: `${(level + 1) * 20}px` }} className="my-2 rtl:mr-0 rtl:ml-5 p-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/30 rounded-md">
            خطأ: تم اكتشاف تبعية دائرية للموظف {member.name}.
        </div>
    );
  }
  visited.add(member.id);

  const children = allMembers.filter(child => child.reportsTo === member.id);
  
  const { rolesMap, hasPermission } = useAuth();
  const { currency } = useSettingsContext();
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
            <TreeNode key={child.id} member={child} allMembers={allMembers} onSelect={onSelect} selectedMemberId={selectedMemberId} level={level + 1} visited={new Set(visited)} />
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
    selectedMemberId: number | null;
}

export const TeamTreeView: React.FC<TeamTreeViewProps> = ({ rootMembers, allMembers, onSelectMember, selectedMemberId }) => {
    return (
        <Card>
            {rootMembers.map(member => (
                <TreeNode key={member.id} member={member} allMembers={allMembers} onSelect={onSelectMember} selectedMemberId={selectedMemberId} level={0} visited={new Set()} />
            ))}
             {rootMembers.length === 0 && (
                <p className="py-4 text-center text-slate-500">لا يوجد أعضاء لعرضهم.</p>
            )}
        </Card>
    );
};