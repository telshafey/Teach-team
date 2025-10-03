import React, { useState, useMemo } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { Card } from '../ui/Card';
import { Role, Permission, RoleId } from '../../types';
import { PlusIcon, TrashIcon, PencilIcon, UsersIcon } from '../ui/Icons';
import { RoleFormModal } from '../modals/RoleFormModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { useToast } from '../../contexts/ToastContext';
import { View } from '../dashboard/Dashboard';

// Mapping permissions to Arabic names and grouping them
const PERMISSION_GROUPS: { group: string; permissions: { id: Permission; name: string }[] }[] = [
    {
        group: 'لوحات التحكم',
        permissions: [
            { id: 'view_dashboard_gm', name: 'عرض لوحة تحكم المدير العام' },
            { id: 'view_dashboard_manager', name: 'عرض لوحة تحكم مدير المشروع' },
            { id: 'view_dashboard_personal', name: 'عرض لوحة التحكم الشخصية' },
        ],
    },
    {
        group: 'المشاريع',
        permissions: [
            { id: 'view_projects_all', name: 'عرض جميع المشاريع' },
            { id: 'view_projects_assigned', name: 'عرض المشاريع المسندة فقط' },
            { id: 'manage_projects', name: 'إدارة المشاريع (إضافة/تعديل)' },
        ],
    },
    {
        group: 'الفريق',
        permissions: [
            { id: 'view_team_all', name: 'عرض جميع أعضاء الفريق' },
            { id: 'manage_team', name: 'إدارة الفريق (إضافة/تعديل أعضاء)' },
            { id: 'generate_performance_notes', name: 'إنشاء ملاحظات الأداء (AI)' },
        ],
    },
    {
        group: 'المالية',
        permissions: [
            { id: 'view_finances', name: 'عرض جميع البيانات المالية' },
            { id: 'view_own_financials', name: 'عرض البيانات المالية الشخصية' },
            { id: 'submit_expenses', name: 'تقديم طلبات الصرف' },
            { id: 'manage_freelancer_contracts', name: 'إدارة عقود المستقلين' },
        ],
    },
    {
        group: 'التقارير والتحليلات',
        permissions: [
            { id: 'view_analytics', name: 'عرض التحليلات' },
            { id: 'view_reports_all', name: 'عرض جميع التقارير' },
            { id: 'view_reports_own', name: 'عرض التقارير الشخصية' },
        ],
    },
     {
        group: 'الإدارة',
        permissions: [
            { id: 'manage_meetings', name: 'إدارة الاجتماعات' },
            { id: 'manage_roles', name: 'إدارة الأدوار والصلاحيات' },
            { id: 'approve_submissions', name: 'الموافقة على الطلبات (مهام، خطط، ...)' },
        ],
    },
];

interface RoleManagementPageProps {
    onNavigate: (view: View, state?: any) => void;
}

export const RoleManagementPage: React.FC<RoleManagementPageProps> = ({ onNavigate }) => {
    const { roles, teamMembers, handleUpdateRole, handleAddRole, handleDeleteRole } = useAppDataContext();
    const { addToast } = useToast();
    const [selectedRole, setSelectedRole] = useState<Role | null>(roles[0] || null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<RoleId | null>(null);

    const membersInSelectedRole = useMemo(() => {
        if (!selectedRole) return [];
        return teamMembers.filter(member => member.roleId === selectedRole.id);
    }, [selectedRole, teamMembers]);

    const handlePermissionChange = (permission: Permission, isChecked: boolean) => {
        if (!selectedRole) return;
        const currentPermissions = selectedRole.permissions || [];
        const newPermissions = isChecked
            ? [...currentPermissions, permission]
            : currentPermissions.filter(p => p !== permission);
        
        const updatedRole = { ...selectedRole, permissions: newPermissions };
        handleUpdateRole(updatedRole);
        setSelectedRole(updatedRole);
    };

    const handleSaveRole = async (roleData: { id?: string, name: string }) => {
        if (roleToEdit) { // Editing
            const roleToUpdate = {...roleToEdit, name: roleData.name};
            await handleUpdateRole(roleToUpdate);
            setSelectedRole(prev => prev && prev.id === roleToEdit.id ? roleToUpdate : prev);
        } else { // Adding
            const newRole = await handleAddRole({ name: roleData.name });
            setSelectedRole(newRole);
        }
    };
    
    const openDeleteConfirm = (roleId: RoleId) => {
        setRoleToDelete(roleId);
        setIsConfirmModalOpen(true);
    };

    const confirmDelete = async () => {
        if (roleToDelete) {
            try {
                await handleDeleteRole(roleToDelete);
                if (selectedRole?.id === roleToDelete) {
                    const remainingRoles = roles.filter(r => r.id !== roleToDelete);
                    setSelectedRole(remainingRoles[0] || null);
                }
            } catch (error) {
                // Toast is handled in context
            } finally {
                setIsConfirmModalOpen(false);
                setRoleToDelete(null);
            }
        }
    };
    
    const coreRoles = ['gm', 'manager', 'employee', 'freelancer'];

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">إدارة الأدوار والصلاحيات</h3>
                 <button onClick={() => { setRoleToEdit(null); setIsFormModalOpen(true); }} className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                    <PlusIcon className="w-4 h-4"/><span>إضافة دور</span>
                </button>
            </div>
            <div className="flex flex-col md:flex-row gap-6">
                {/* Roles List */}
                <div className="md:w-1/4">
                    <ul className="space-y-1">
                        {roles.map(role => (
                            <li key={role.id}>
                                <button onClick={() => setSelectedRole(role)} className={`w-full text-right p-3 rounded-md transition-colors text-sm font-medium flex justify-between items-center ${selectedRole?.id === role.id ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                    <span>{role.name}</span>
                                    {!coreRoles.includes(role.id) && (
                                        <div className="flex items-center">
                                            <button onClick={(e) => { e.stopPropagation(); setRoleToEdit(role); setIsFormModalOpen(true); }} className="p-1 hover:text-sky-600"><PencilIcon className="w-4 h-4" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(role.id); }} className="p-1 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                {/* Permissions & Members */}
                <div className="md:w-3/4">
                    {selectedRole ? (
                        <div className="space-y-6">
                            <Card title="صلاحيات الدور">
                                <div className="space-y-6">
                                    {PERMISSION_GROUPS.map(group => (
                                        <div key={group.group}>
                                            <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2 border-b pb-1">{group.group}</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                                                {group.permissions.map(perm => (
                                                    <label key={perm.id} className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedRole.permissions?.includes(perm.id)}
                                                            onChange={(e) => handlePermissionChange(perm.id, e.target.checked)}
                                                            disabled={selectedRole.id === 'gm'}
                                                            className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50"
                                                        />
                                                        <span className="text-sm text-slate-600 dark:text-slate-300">{perm.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                            <Card title="أعضاء بهذا الدور" icon={<UsersIcon className="w-5 h-5"/>}>
                                {membersInSelectedRole.length > 0 ? (
                                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {membersInSelectedRole.map(member => (
                                            <div key={member.id} className="flex items-center justify-between py-2">
                                                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                                    <img src={member.avatarUrl} alt={member.name} className="w-8 h-8 rounded-full" />
                                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{member.name}</span>
                                                </div>
                                                <button onClick={() => onNavigate('teamDetail', { memberId: member.id, from: 'roles' })} className="text-sm font-semibold text-sky-600 hover:text-sky-800">
                                                    عرض التفاصيل
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">لا يوجد أعضاء معينون لهذا الدور حاليًا.</p>
                                )}
                            </Card>
                        </div>
                    ) : (
                        <p className="text-center text-slate-500">اختر دورًا من القائمة لعرض صلاحياته.</p>
                    )}
                </div>
            </div>
            
            {isFormModalOpen && (
                <RoleFormModal
                    isOpen={isFormModalOpen}
                    onClose={() => setIsFormModalOpen(false)}
                    onSave={handleSaveRole}
                    role={roleToEdit}
                />
            )}
            {isConfirmModalOpen && (
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={confirmDelete}
                    title="تأكيد الحذف"
                    message={`هل أنت متأكد من رغبتك في حذف هذا الدور؟ لا يمكن التراجع عن هذا الإجراء.`}
                    confirmText="حذف"
                    isDestructive
                />
            )}
        </Card>
    );
};
