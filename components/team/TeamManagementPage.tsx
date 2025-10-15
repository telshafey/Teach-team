import React, { useState, useMemo, useEffect } from 'react';
import { useTeamContext } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';
import { TeamMember, TeamMemberFormData } from '../../types';
import { TeamTreeView } from './TeamTreeView';
import { TeamMemberDetailPage } from './TeamMemberDetailPage';
import { Card } from '../ui/Card';
import { PlusIcon, UserPlusIcon } from '../ui/Icons';
import { TeamMemberFormModal } from '../modals/TeamMemberFormModal';
import { EmptyState } from '../ui/EmptyState';

interface TeamManagementPageProps {
    initialMemberId?: number;
}

export const TeamManagementPage: React.FC<TeamManagementPageProps> = ({ initialMemberId }) => {
    const { teamMembers, handleAddMember, handleUpdateMember } = useTeamContext();
    const { currentUser, hasPermission } = useAuth();
    
    const [selectedMemberId, setSelectedMemberId] = useState<number | null>(initialMemberId || null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

    useEffect(() => {
        if (initialMemberId) {
            setSelectedMemberId(initialMemberId);
        } else if (currentUser && (currentUser.roleId === 'employee' || currentUser.roleId === 'freelancer')) {
            // Default to selecting self if user is not a manager
            setSelectedMemberId(currentUser.id);
        }
    }, [initialMemberId, currentUser]);
    
    const visibleTeam = useMemo(() => {
        if (!currentUser) return { visibleMembers: [], rootMembers: [] };

        // GM sees everyone
        if (currentUser.roleId === 'gm') {
            const memberIds = new Set(teamMembers.map(m => m.id));
            const roots = teamMembers.filter(m => !m.reportsTo || !memberIds.has(m.reportsTo));
            return { visibleMembers: teamMembers, rootMembers: roots };
        }

        // Manager sees themself and their reports (direct and indirect)
        if (currentUser.roleId === 'manager') {
            const managedTeam: TeamMember[] = [];
            const findReports = (managerId: number) => {
                const directReports = teamMembers.filter(m => m.reportsTo === managerId);
                for (const report of directReports) {
                    managedTeam.push(report);
                    findReports(report.id); // Recursively find reports of reports
                }
            };

            findReports(currentUser.id);
            const visible = [currentUser, ...managedTeam];
            const roots = [currentUser]; // The manager is the root of their own tree
            
            return { visibleMembers: visible, rootMembers: roots };
        }

        // Employee/Freelancer sees only themself
        return { visibleMembers: [currentUser], rootMembers: [currentUser] };

    }, [currentUser, teamMembers]);
    
    const selectedMember = useMemo(() => {
        // Ensure the selected member is within the visible team
        return visibleTeam.visibleMembers.find(m => m.id === selectedMemberId);
    }, [visibleTeam.visibleMembers, selectedMemberId]);


    const handleSaveMember = async (memberData: TeamMemberFormData, isNew: boolean) => {
        if (isNew) {
            await handleAddMember(memberData);
        } else if (editingMember) {
            await handleUpdateMember(editingMember.id, memberData);
        }
    };

    const handleOpenForm = (member: TeamMember | null) => {
        setEditingMember(member);
        setIsFormOpen(true);
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">إدارة الفريق</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">عرض الهيكل التنظيمي وإدارة أعضاء الفريق.</p>
                </div>
                {hasPermission('manage_team') && (
                    <button onClick={() => handleOpenForm(null)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 w-full md:w-auto">
                        <PlusIcon className="w-5 h-5"/><span>إضافة عضو جديد</span>
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <TeamTreeView 
                        rootMembers={visibleTeam.rootMembers} 
                        allMembers={visibleTeam.visibleMembers}
                        onSelectMember={setSelectedMemberId}
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
                        <Card>
                            <EmptyState
                                icon={<UserPlusIcon className="w-12 h-12" />}
                                title="عرض تفاصيل العضو"
                                message="اختر عضواً من الهيكل التنظيمي لعرض بياناته التفصيلية."
                            />
                        </Card>
                    )}
                </div>
            </div>

            {isFormOpen && (
                <TeamMemberFormModal 
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    onSave={handleSaveMember}
                    member={editingMember}
                />
            )}
        </div>
    );
};
