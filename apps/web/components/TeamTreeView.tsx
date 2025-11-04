import React from 'react';
import { TeamMember } from '@shared/types';
import { UserIcon } from './ui/Icons';

interface TeamTreeViewProps {
  members: TeamMember[];
  managerId?: number | null;
  onMemberClick: (memberId: number) => void;
  selectedMemberId: number | null;
}

const TreeNode: React.FC<{
  member: TeamMember;
  allMembers: TeamMember[];
  onMemberClick: (memberId: number) => void;
  selectedMemberId: number | null;
}> = ({ member, allMembers, onMemberClick, selectedMemberId }) => {
  const reports = allMembers.filter(m => m.reportsTo === member.id);
  const isSelected = selectedMemberId === member.id;

  return (
    <div className="ml-6 rtl:ml-0 rtl:mr-6">
      <div 
        onClick={() => onMemberClick(member.id)}
        className={`flex items-center space-x-2 rtl:space-x-reverse p-1.5 rounded-md cursor-pointer transition-colors ${
          isSelected ? 'bg-sky-100 dark:bg-sky-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        <img src={member.avatarUrl} alt={member.name} className="w-8 h-8 rounded-full" />
        <div>
          <p className={`text-sm font-semibold ${isSelected ? 'text-sky-700 dark:text-sky-300' : ''}`}>{member.name}</p>
        </div>
      </div>
      {reports.length > 0 && (
        <div className="border-r-2 border-slate-200 dark:border-slate-600">
          {reports.map(report => (
            <TreeNode
              key={report.id}
              member={report}
              allMembers={allMembers}
              onMemberClick={onMemberClick}
              selectedMemberId={selectedMemberId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TeamTreeView: React.FC<TeamTreeViewProps> = ({ members, onMemberClick, selectedMemberId }) => {
  const topLevelMembers = members.filter(m => !m.reportsTo);

  if (members.length === 0) {
      return <p className="text-center text-slate-500 py-4">لا يوجد أعضاء في الفريق لعرضهم.</p>
  }

  return (
    <div className="space-y-2">
      {topLevelMembers.map(member => (
        <TreeNode
          key={member.id}
          member={member}
          allMembers={members}
          onMemberClick={onMemberClick}
          selectedMemberId={selectedMemberId}
        />
      ))}
    </div>
  );
};