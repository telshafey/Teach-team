import React, { useState, useMemo } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { TeamTreeView } from './TeamTreeView';
import { TeamMemberDetailPage } from './TeamMemberDetailPage';
import { View } from '../dashboard/Dashboard';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { TeamMember, TeamMemberFormData } from '../../types';
import { TeamMemberFormModal } from '../modals/TeamMemberFormModal';
import { Card } from '../ui/Card';
import { UsersIcon } from '../ui/Icons';
import { useAuth } from '../../contexts/AuthContext';

interface TeamManagementPageProps {
    initialView?: View;
    initialProps?: any;
    onNavigate: (view: View, props?: any) => void;
}

export const TeamManagementPage: React.FC<TeamManagementPageProps> = ({ initialView, initialProps, onNavigate }) => {
    const { teamMembers, isLoading, handleAddMember, handleUpdateMember } = useAppDataContext();
    const { currentUser } = useAuth();
    const [selectedMemberId, setSelectedMemberId] = useState<number | null>(initialProps?.memberId || null);
    
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

    const { displayedMembers, rootOfTree } = useMemo(() => {
        if (!currentUser) return { displayedMembers: [], rootOfTree: [] };

        if (currentUser.roleId === 'gm') {
            return {
                displayedMembers: teamMembers,
                rootOfTree: teamMembers.filter(m => !m.reportsTo),
            };
        }

        const getDescendants = (managerId: number, allMembers: TeamMember[]): TeamMember[] => {
            const directReports = allMembers.filter(m => m.reportsTo === managerId);
            if (directReports.length === 0) return [];
            
            let allDescendants: TeamMember[] = [...directReports];
            directReports.forEach(report => {
                allDescendants = [...allDescendants, ...getDescendants(report.id, allMembers)];
            });
            return allDescendants;
        };
        
        const descendants = getDescendants(currentUser.id, teamMembers);
        const visibleMembers = [currentUser, ...descendants];
        
        const uniqueVisibleMembers = Array.from(new Map(visibleMembers.map(m => [m.id, m])).values());

        return {
            displayedMembers: uniqueVisibleMembers,
            rootOfTree: [currentUser],
        };

    }, [currentUser, teamMembers]);


    const selectedMember = useMemo(() => {
        if (!selectedMemberId) return null;
        return displayedMembers.find(m => m.id === selectedMemberId);
    }, [selectedMemberId, displayedMembers]);
    
    const handleSelectMember = (memberId: number) => {
        setSelectedMemberId(memberId);
    };

    const handleOpenForm = (member: TeamMember | null) => {
        setEditingMember(member);
        setIsFormModalOpen(true);
    };

    const handleSaveMember = async (memberData: TeamMemberFormData, isNew: boolean) => {
        if (isNew) {
            await handleAddMember(memberData);
        } else if (editingMember) {
            await handleUpdateMember(editingMember.id, memberData);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 h-full">
                <LoadingSpinner />
            </div>
        );
    }
    
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 h-full">
                <div className="md:col-span-1 xl:col-span-1 border-l border-slate-200 dark:border-slate-700 h-full overflow-y-auto">
                     <TeamTreeView 
                        rootMembers={rootOfTree}
                        allMembers={displayedMembers}
                        onSelectMember={handleSelectMember} 
                        onAddMember={() => handleOpenForm(null)}
                        selectedMemberId={selectedMemberId}
                    />
                </div>
                <div className="md:col-span-2 xl:col-span-3 h-full overflow-y-auto">
                    {selectedMember ? (
                        <TeamMemberDetailPage
                            member={selectedMember}
                            onBack={() => setSelectedMemberId(null)}
                            onEdit={() => handleOpenForm(selectedMember)}
                            onNavigate={onNavigate}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center p-6">
                            <Card className="text-center w-full max-w-md">
                                <div className="p-8">
                                     <UsersIcon className="w-12 h-12 mx-auto text-slate-400"/>
                                    <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">عرض تفاصيل الفريق</h2>
                                    <p className="mt-2 text-md text-slate-500 dark:text-slate-400">اختر عضوًا من القائمة الجانبية لعرض ملفه الشخصي الكامل وبيانات أدائه.</p>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
            
            {isFormModalOpen && (
                <TeamMemberFormModal 
                    isOpen={isFormModalOpen}
                    onClose={() => setIsFormModalOpen(false)}
                    onSave={handleSaveMember}
                    member={editingMember}
                />
            )}
        </>
    );
};