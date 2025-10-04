import React, { useEffect } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
// FIX: Corrected import path.
import { TeamMember, Role } from '../../types';
import { Card } from '../ui/Card';
import { UserIcon } from '../ui/Icons';

interface TeamMemberNodeProps {
  member: TeamMember;
  allMembers: TeamMember[];
  onSelectMember: (memberId: number) => void;
  level: number;
  rolesMap: Record<string, Role>;
}

const TeamMemberNode: React.FC<TeamMemberNodeProps> = ({ member, allMembers, onSelectMember, level, rolesMap }) => {
  const directReports = allMembers.filter(m => m.reportsTo === member.id);
  const role = rolesMap[member.roleId];

  return (
    <div>
      <div 
        onClick={() => onSelectMember(member.id)}
        className="flex items-center space-x-4 rtl:space-x-reverse p-3 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
        style={{ paddingRight: `${level * 2}rem` }}
      >
        <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full" />
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center">
            {member.name}
            {role?.name === 'مستقل' && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 mr-2">مستقل</span>}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{role?.name}</p>
        </div>
      </div>
      {directReports.length > 0 && (
        <div className="border-r-2 border-slate-200 dark:border-slate-600 mr-5 rtl:mr-0 rtl:ml-5">
          {directReports.map(report => (
            <TeamMemberNode 
              key={report.id} 
              member={report} 
              allMembers={allMembers} 
              onSelectMember={onSelectMember} 
              level={level + 1} 
              rolesMap={rolesMap}
            />
          ))}
        </div>
      )}
    </div>
  );
};


interface TeamTreeViewProps {
  onSelectMember: (memberId: number) => void;
  memberToViewId?: number | null;
  onViewed: () => void;
}

export const TeamTreeView: React.FC<TeamTreeViewProps> = ({ onSelectMember, memberToViewId, onViewed }) => {
  const { teamMembers } = useAppDataContext();
  const { rolesMap } = useAuth();
  
  useEffect(() => {
    if(memberToViewId) {
      onSelectMember(memberToViewId);
      onViewed();
    }
  }, [memberToViewId, onSelectMember, onViewed]);

  const rootMembers = teamMembers.filter(m => !m.reportsTo);

  return (
    <div className="p-6">
       <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">هيكل الفريق</h2>
        <p className="text-md text-slate-500 dark:text-slate-400">استعرض التسلسل الهرمي لفريقك.</p>
      </div>
      <Card title="أعضاء الفريق" icon={<UserIcon className="w-5 h-5"/>}>
        <div className="space-y-2">
            {rootMembers.map(member => (
              <TeamMemberNode 
                key={member.id} 
                member={member} 
                allMembers={teamMembers} 
                onSelectMember={onSelectMember}
                level={0}
                rolesMap={rolesMap}
              />
            ))}
        </div>
      </Card>
    </div>
  );
};
