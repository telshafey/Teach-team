import React, { useState, useMemo } from 'react';
import { useTeamContext } from '../../contexts/TeamContext';
import { TeamTreeView } from './TeamTreeView';
import { TeamMemberDetailPage } from './TeamMemberDetailPage';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { TeamMember, TeamMemberFormData } from '../../types';
import { TeamMemberFormModal } from '../modals/TeamMemberFormModal';
import { Card } from '../ui/Card';
import { UsersIcon, UserPlusIcon } from '../ui/Icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';

interface TeamManagementPageProps {
    initialView?: 'teamDetail';
    initialProps?: any;
}

export const TeamManagementPage: React.FC<TeamManagementPageProps> = ({ initialProps }) => {
    const { teamMembers, isLoading, handleAddMember, handleUpdateMember } = useTeamContext();
    const { currentUser, hasPermission } = useAuth();
    const [selectedMemberId, setSelectedMemberId] = useState<number | null>(initialProps?.memberId || currentUser?.id || null);
    
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
            <div className="p-6">
                 <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">الفريق</h2>
                        <p className="text-md text-slate-500 dark:text-slate-400">الهيكل التنظيمي لفريقك.</p>
                    </div>
                    {hasPermission('manage_team') && (
                        <button onClick={() => handleOpenForm(null)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 w-full md:w-auto">
                            <UserPlusIcon className="w-5 h-5"/><span>إضافة عضو</span>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <TeamTreeView 
                            rootMembers={rootOfTree}
                            allMembers={displayedMembers}
                            onSelectMember={handleSelectMember} 
                            selectedMemberId={selectedMemberId}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        {selectedMember ? (
                            <TeamMemberDetailPage
                                member={selectedMember}
                                onEdit={() => handleOpenForm(selectedMember)}
                            />
                        ) : (
                            <Card className="flex h-full min-h-[400px] items-center justify-center">
                                <div className="text-center p-8">
                                    <UsersIcon className="w-12 h-12 mx-auto text-slate-400"/>
                                    <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">عرض تفاصيل الفريق</h2>
                                    <p className="mt-2 text-md text-slate-500 dark:text-slate-400">اختر عضوًا من القائمة الجانبية لعرض ملفه الشخصي الكامل وبيانات أدائه.</p>
                                </div>
                            </Card>
                        )}
                    </div>
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