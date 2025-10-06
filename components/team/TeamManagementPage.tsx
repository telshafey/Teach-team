import React, { useState, useMemo, useCallback } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { TeamTreeView } from './TeamTreeView';
import { TeamMemberDetailPage } from './TeamMemberDetailPage';
import { View } from '../dashboard/Dashboard';

interface TeamManagementPageProps {
  initialView: View;
  initialProps: any;
  onNavigate: (view: View, props?: any) => void;
}

export const TeamManagementPage: React.FC<TeamManagementPageProps> = ({ initialView, initialProps }) => {
  const { teamMembers } = useAppDataContext();
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(initialProps?.memberId || null);

  const selectedMember = useMemo(() => {
    return teamMembers.find(member => member.id === selectedMemberId) || null;
  }, [selectedMemberId, teamMembers]);

  const handleSelectMember = useCallback((memberId: number) => {
    setSelectedMemberId(memberId);
  }, []);
  
  const handleBack = useCallback(() => {
    setSelectedMemberId(null);
  }, []);

  if (selectedMember) {
    return <TeamMemberDetailPage member={selectedMember} onBack={handleBack} />;
  }

  return <TeamTreeView onSelectMember={handleSelectMember} />;
};
