import React, { useState, useMemo, useEffect } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Role, Permission } from '../../types';
import { Card } from '../ui/Card';
import { PlusIcon, TrashIcon, PencilIcon } from '../ui/Icons';
import { RoleFormModal } from '../modals/RoleFormModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { useToast } from '../../contexts/ToastContext';
import { View } from '../dashboard/Dashboard';
import { PERMISSION_GROUPS, PERMISSION_DESCRIPTIONS } from '../../permissions';

interface RoleManagementPageProps {
    onNavigate: (view: View, state?: any) => void;
    initialRoleId?: string;
}

export const RoleManagementPage: React.FC<RoleManagementPageProps> = ({ onNavigate, initialRoleId }) => {
    const { roles, handleAddRole, handleUpdateRole, handleDeleteRole } = useAppDataContext();
    const { hasPermission } = useAuth();
    const { addToast } = useToast();
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [editedPermissions, setEditedPermissions] = useState<Permission[]>([]);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

    const canManageRoles = hasPermission('manage_roles');

    useEffect(() => {
        if (initialRoleId && roles.length > 0) {
            const role = roles.find(r => r.id === initialRoleId);
            setSelectedRole(role || roles[0] || null);
        } else if (!selectedRole && roles.length > 0) {
            setSelectedRole(roles[0]);
        }
    }, [initialRoleId, roles, selectedRole]);


    // Sync permissions when role changes
    React.useEffect(() => {
        if (selectedRole) {
            setEditedPermissions(selectedRole.permissions || []);
        } else {
            setEditedPermissions([]);
        }
    }, [selectedRole]);
    
    const handlePermissionChange = (permission: Permission, isChecked: boolean) => {
        if (isChecked) {
            setEditedPermissions(prev => [...prev, permission]);
        } else {
            setEditedPermissions(prev => prev.filter(p => p !== permission));
        }
    };

    const handleSaveChanges = async () => {
        if (!selectedRole || !canManageRoles) return;

        try {
            await handleUpdateRole({ ...selectedRole, permissions: editedPermissions });
            addToast(`تم تحديث صلاحيات دور "${selectedRole.name}".`, 'success');
        } catch (error) {
            addToast('فشل تحديث الصلاحيات.', 'error');
        }
    };
    
    const handleSaveRole = async (roleData: { id?: string, name: string; permissions: Permission[] }) => {
        try {
            if (roleData.id) { // This is an update
                const roleToUpdate = roles.find(r => r.id === roleData.id);
                if (roleToUpdate) {
                    await handleUpdateRole({ ...roleToUpdate, name: roleData.name });
                    addToast(`تم تعديل اسم الدور إلى "${roleData.name}".`, 'success');
                }
            } else { // This is a new role
                await handleAddRole({ name: roleData.name, permissions: [] });
                addToast(`تم إضافة دور "${roleData.name}" بنجاح.`, 'success');
            }
        } catch (e) {
             addToast('حدث خطأ أثناء حفظ الدور.', 'error');
        }
    };
    
    const confirmDelete = async () => {
        if (!roleToDelete) return;
        try {
            await handleDeleteRole(roleToDelete.id);
            addToast(`تم حذف دور "${roleToDelete.name}".`, 'success');
            if (selectedRole?.id === roleToDelete.id) {
                setSelectedRole(roles[0] || null);
            }
            setRoleToDelete(null);
        } catch (e) {
            addToast('حدث خطأ أثناء حذف الدور.', 'error');
        }
    };

    const isDirty = useMemo(() => {
        if (!selectedRole) return false;
        const original = selectedRole.permissions || [];
        if (original.length !== editedPermissions.length) return true;
        const originalSet = new Set(original);
        return !editedPermissions.every(p => originalSet.has(p));
    }, [selectedRole, editedPermissions]);

    return (
        <div className="flex flex-col md:flex-row gap-6">
            <Card className="w-full md:w-1/3 h-fit">
                <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-200">الأدوار</h3>
                        {canManageRoles && (
                            <button onClick={() => { setRoleToEdit(null); setIsFormModalOpen(true); }} className="p-1 text-sky-600 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded-full"><PlusIcon className="w-5 h-5"/></button>
                        )}
                    </div>
                    <ul className="space-y-1">
                        {roles.map(role => (
                            <li key={role.id}>
                                <div
                                    onClick={() => setSelectedRole(role)}
                                    className={`group flex justify-between items-center p-2 rounded-md text-sm cursor-pointer ${selectedRole?.id === role.id ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'}`}
                                >
                                    <span>{role.name}</span>
                                    {canManageRoles && (
                                        <div className="flex items-center space-x-1 rtl:space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => {e.stopPropagation(); setRoleToEdit(role); setIsFormModalOpen(true);}} className="p-1"><PencilIcon className="w-4 h-4 text-slate-500"/></button>
                                            <button onClick={(e) => {e.stopPropagation(); setRoleToDelete(role);}} className="p-1"><TrashIcon className="w-4 h-4 text-red-500"/></button>
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </Card>
            <Card className="flex-1">
                {selectedRole ? (
                    <div className="p-4">
                         <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-100">صلاحيات دور: {selectedRole.name}</h3>
                         <div className="space-y-6">
                             {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
                                <div key={groupName}>
                                    <h4 className="font-semibold text-sm text-slate-600 dark:text-slate-300 mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">{groupName}</h4>
                                    <div className="space-y-2">
                                        {permissions.map(p => (
                                            <label key={p} className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer">
                                                <input 
                                                    type="checkbox"
                                                    checked={editedPermissions.includes(p)}
                                                    onChange={(e) => handlePermissionChange(p, e.target.checked)}
                                                    disabled={!canManageRoles}
                                                    className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50"
                                                />
                                                <span className="text-sm text-slate-700 dark:text-slate-200">{PERMISSION_DESCRIPTIONS[p] || p}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                             ))}
                         </div>
                         {canManageRoles && isDirty && (
                             <div className="mt-6 flex justify-end">
                                 <button onClick={handleSaveChanges} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">حفظ التغييرات</button>
                             </div>
                         )}
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">اختر دورًا لعرض صلاحياته.</div>
                )}
            </Card>
            
            {isFormModalOpen && (
                <RoleFormModal 
                    isOpen={isFormModalOpen}
                    onClose={() => setIsFormModalOpen(false)}
                    onSave={handleSaveRole as any} // Cast to avoid permission property issue
                    role={roleToEdit}
                />
            )}

            {roleToDelete && (
                <ConfirmationModal
                    isOpen={!!roleToDelete}
                    onClose={() => setRoleToDelete(null)}
                    onConfirm={confirmDelete}
                    title="تأكيد حذف الدور"
                    message={`هل أنت متأكد من رغبتك في حذف دور "${roleToDelete.name}"؟`}
                    isDestructive
                />
            )}
        </div>
    );
};
