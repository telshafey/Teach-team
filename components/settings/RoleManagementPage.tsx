import React, { useState, useMemo, useEffect } from 'react';
import { useTeamContext } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';
import { Role, Permission } from '../../types';
import { Card } from '../ui/Card';
import { PlusIcon, TrashIcon, PencilIcon } from '../ui/Icons';
import { RoleFormModal } from '../modals/RoleFormModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { useToast } from '../../contexts/ToastContext';
import { PERMISSION_GROUPS, PERMISSION_DESCRIPTIONS } from '../../permissions';
import { useNavigation } from '../../contexts/NavigationContext';

interface RoleManagementPageProps {
    initialRoleId?: string;
}

export const RoleManagementPage: React.FC<RoleManagementPageProps> = ({ initialRoleId }) => {
    const { onNavigate } = useNavigation();
    const { roles, handleAddRole, handleUpdateRole, handleDeleteRole, teamMembers } = useTeamContext();
    const { hasPermission } = useAuth();
    const { addToast } = useToast();
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [editedPermissions, setEditedPermissions] = useState<Permission[]>([]);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const canManageRoles = hasPermission('manage_roles');

    useEffect(() => {
        if (initialRoleId && roles.length > 0) {
            const role = roles.find(r => r.id === initialRoleId);
            setSelectedRole(role || roles[0] || null);
        } else if (!selectedRole && roles.length > 0) {
            setSelectedRole(roles[0]);
        }
    }, [initialRoleId, roles, selectedRole]);

    useEffect(() => {
        if (selectedRole) {
            setEditedPermissions(selectedRole.permissions || []);
        } else {
            setEditedPermissions([]);
        }
    }, [selectedRole]);
    
    const hasChanges = useMemo(() => {
        if (!selectedRole) return false;
        const originalPermissions = new Set(selectedRole.permissions || []);
        const editedPermissionsSet = new Set(editedPermissions);
        return originalPermissions.size !== editedPermissionsSet.size ||
               ![...originalPermissions].every(p => editedPermissionsSet.has(p));
    }, [selectedRole, editedPermissions]);

    const handlePermissionChange = (permission: Permission, checked: boolean) => {
        setEditedPermissions(prev =>
            checked ? [...prev, permission] : prev.filter(p => p !== permission)
        );
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;
        setIsSaving(true);
        try {
            await handleUpdateRole({ ...selectedRole, permissions: editedPermissions });
            addToast('تم حفظ الصلاحيات بنجاح.', 'success');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSaveRoleForm = async (roleData: { id?: string, name: string }) => {
        if (roleToEdit) {
            await handleUpdateRole({ ...roleToEdit, name: roleData.name });
        } else {
            await handleAddRole(roleData);
        }
    };
    
    const confirmDelete = async () => {
        if (roleToDelete) {
            await handleDeleteRole(roleToDelete.id);
            if (selectedRole?.id === roleToDelete.id) {
                setSelectedRole(roles.length > 1 ? roles[0] : null);
            }
            setRoleToDelete(null);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
                <Card title="الأدوار" headerActions={canManageRoles ? <button onClick={() => { setRoleToEdit(null); setIsFormModalOpen(true); }} className="p-1 text-sky-600 dark:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><PlusIcon className="w-5 h-5"/></button> : null}>
                    <nav className="space-y-1">
                        {roles.map(role => (
                            <a
                                key={role.id}
                                href="#"
                                onClick={(e) => { e.preventDefault(); setSelectedRole(role); }}
                                className={`group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md ${selectedRole?.id === role.id ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700'}`}
                            >
                                <span>{role.name}</span>
                                {canManageRoles && role.id !== 'gm' && role.id !== 'manager' && (
                                     <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); setRoleToEdit(role); setIsFormModalOpen(true);}} className="p-1 text-slate-400 hover:text-sky-500"><PencilIcon className="w-4 h-4"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); setRoleToDelete(role);}} className="p-1 text-slate-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                     </div>
                                )}
                            </a>
                        ))}
                    </nav>
                </Card>
            </div>
            <div className="md:col-span-3">
                {selectedRole ? (
                    <Card title={`صلاحيات دور: ${selectedRole.name}`}>
                        <div className="space-y-6">
                            {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
                                <div key={groupName}>
                                    <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3 border-b pb-2">{groupName}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                        {permissions.map(permission => (
                                            <label key={permission} className="flex items-center space-x-3 rtl:space-x-reverse">
                                                <input
                                                    type="checkbox"
                                                    checked={editedPermissions.includes(permission)}
                                                    onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                                                    disabled={!canManageRoles || selectedRole.id === 'gm'}
                                                    className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50"
                                                />
                                                <span className="text-sm text-slate-600 dark:text-slate-300">{PERMISSION_DESCRIPTIONS[permission]}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {canManageRoles && hasChanges && selectedRole.id !== 'gm' && (
                            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                                <button onClick={handleSavePermissions} disabled={isSaving} className="px-6 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                                    {isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                                </button>
                            </div>
                        )}
                    </Card>
                ) : <p>اختر دورًا لعرض صلاحياته.</p>}
            </div>

             {isFormModalOpen && (
                <RoleFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} onSave={handleSaveRoleForm} role={roleToEdit} />
             )}
             {roleToDelete && (
                <ConfirmationModal 
                    isOpen={!!roleToDelete} 
                    onClose={() => setRoleToDelete(null)} 
                    onConfirm={confirmDelete}
                    title="تأكيد حذف الدور"
                    message={`هل أنت متأكد من رغبتك في حذف دور "${roleToDelete.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
                    isDestructive
                />
             )}
        </div>
    );
};
