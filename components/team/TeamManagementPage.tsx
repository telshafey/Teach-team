import React, { useState, useMemo } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { TeamTreeView } from './TeamTreeView';
import { TeamMemberFormModal } from '../modals/TeamMemberFormModal';
import { TeamMember, TeamMemberFormData } from '../../types';
import { PlusIcon, UsersIcon, SearchIcon } from '../ui/Icons';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';

export const TeamManagementPage: React.FC<{ onSelectMemberForDetail: (memberId: number) => void; }> = ({ onSelectMemberForDetail }) => {
    const { teamMembers, roles, handleUpdateMember } = useAppDataContext();
    const { rolesMap, hasPermission } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    const handleOpenModal = (member: TeamMember | null) => {
        setEditingMember(member);
        setIsModalOpen(true);
    };

    const handleSaveMember = async (memberData: TeamMemberFormData) => {
        if (editingMember) {
            await handleUpdateMember({ ...editingMember, ...memberData });
        } else {
            const newMember: TeamMember = {
                id: Date.now(),
                ...memberData,
                weeklyPlan: { hours: {}, status: 'approved' }
            };
            await handleUpdateMember(newMember);
        }
    };
    
    const filteredMembers = useMemo(() => {
        return teamMembers.filter(member => {
            const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === 'all' || member.roleId === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [teamMembers, searchTerm, roleFilter]);

    return (
        <div className="p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">إدارة الفريق</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">استعرض وأدر أعضاء فريقك.</p>
                </div>
                 <div className="flex items-center flex-wrap gap-2">
                    <div className="relative">
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <SearchIcon className="w-5 h-5 text-slate-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="ابحث بالاسم..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-56 py-2 pr-10 pl-4 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-700 dark:text-white"
                        />
                    </div>

                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="py-2 pr-3 pl-8 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-700 dark:text-white"
                        aria-label="تصفية حسب الدور"
                    >
                        <option value="all">كل الأدوار</option>
                        {roles.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                    </select>

                    {hasPermission('manage_team') && (
                        <button onClick={() => handleOpenModal(null)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                            <PlusIcon className="w-5 h-5"/><span>إضافة عضو</span>
                        </button>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <TeamTreeView onSelectMember={onSelectMemberForDetail} onViewed={() => {}} />
                </div>
                <div className="lg:col-span-2">
                     <Card title="قائمة الأعضاء">
                        {teamMembers.length > 0 ? (
                            filteredMembers.length > 0 ? (
                                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {filteredMembers.map(member => (
                                        <div key={member.id} className="flex justify-between items-center p-3">
                                            <div className="flex items-center space-x-4 rtl:space-x-reverse">
                                                <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full" />
                                                <div>
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{member.name}</p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">{rolesMap[member.roleId]?.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                                <button onClick={() => onSelectMemberForDetail(member.id)} className="text-sm font-medium text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300">عرض التفاصيل</button>
                                                {hasPermission('manage_team') && (
                                                    <button onClick={() => handleOpenModal(member)} className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">تعديل</button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={<SearchIcon className="w-10 h-10" />}
                                    title="لا يوجد أعضاء يطابقون بحثك"
                                    message="حاول تغيير كلمات البحث أو الفلاتر المستخدمة."
                                />
                            )
                        ) : (
                            <EmptyState
                                icon={<UsersIcon className="w-10 h-10" />}
                                title="لا يوجد أعضاء في الفريق"
                                message="ابدأ بإضافة أعضاء فريقك لإدارة مهامهم وأدائهم."
                            />
                        )}
                     </Card>
                </div>
            </div>

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