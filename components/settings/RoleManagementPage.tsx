import React, { useState, useMemo } from 'react';
import { useTeamContext } from '../../contexts/TeamContext';
import { Role, Permission } from '../../types';
import { PERMISSION_GROUPS, PERMISSION_DESCRIPTIONS } from '../../permissions';
import { Card } from '../ui/Card';
import { PlusIcon, TrashIcon, PencilIcon, LockClosedIcon } from '../ui/Icons';
import { RoleFormModal } from '../modals/RoleFormModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { useToast } from '../../contexts/ToastContext';
import { EmptyState } from '../ui/EmptyState';

interface RoleManagementPageProps {
    initialRoleId?: string;
}

export const RoleManagementPage: React.FC<RoleManagementPageProps> = ({ initialRoleId }) => {
    const { roles, handleAddRole, handleUpdateRole, handleDeleteRole } = useTeamContext();
    const { addToast } = useToast();
    
    const PROTECTED_ROLES = ['gm', 'manager'];
    const firstEditableRole = roles.find(r => !PROTECTED_ROLES.includes(r.id));

    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(initialRoleId || firstEditableRole?.id || null);
    
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

    const selectedRole = useMemo(() => {
        return roles.find(r => r.id === selectedRoleId);
    }, [roles, selectedRoleId]);

    const handlePermissionToggle = (permission: Permission) => {
        if (!selectedRole || PROTECTED_ROLES.includes(selectedRole.id)) return;
        
        const currentPermissions = selectedRole.permissions || [];
        const newPermissions = currentPermissions.includes(permission)
            ? currentPermissions.filter(p => p !== permission)
            : [...currentPermissions, permission];
        
        handleUpdateRole({ ...selectedRole, permissions: newPermissions });
    };

    const handleSaveRole = async (roleData: { id?: string, name: string }) => {
        if (roleData.id) {
            const roleToUpdate = roles.find(r => r.id === roleData.id);
            if (roleToUpdate) {
                await handleUpdateRole({ ...roleToUpdate, name: roleData.name });
            }
        } else {
            await handleAddRole(roleData);
        }
    };

    const confirmDeleteRole = async () => {
        if (roleToDelete) {
            await handleDeleteRole(roleToDelete.id);
            setRoleToDelete(null);
            if (selectedRoleId === roleToDelete.id) {
                setSelectedRoleId(firstEditableRole?.id || null);
            }
        }
    };

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card 
                        title="الأدوار"
                        headerActions={
                            <button onClick={() => { setEditingRole(null); setIsFormModalOpen(true); }} className="p-1.5 text-sky-600 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded-full" title="إضافة دور جديد">
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        }
                    >
                        <ul className="space-y-1">
                            {roles.map(role => {
                                const isProtected = PROTECTED_ROLES.includes(role.id);
                                return (
                                    <li key={role.id}>
                                        <div
                                            onClick={() => setSelectedRoleId(role.id)}
                                            className={`flex justify-between items-center p-2 rounded-md cursor-pointer ${selectedRoleId === role.id ? 'bg-sky-100 dark:bg-sky-900/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                        >
                                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                                {isProtected && <LockClosedIcon className="w-4 h-4 text-slate-400" />}
                                                <span className={`font-medium ${selectedRoleId === role.id ? 'text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-200'}`}>{role.name}</span>
                                            </div>
                                            {!isProtected && (
                                                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingRole(role); setIsFormModalOpen(true); }} className="p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400" title="تعديل الاسم"><PencilIcon className="w-4 h-4" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setRoleToDelete(role); }} className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400" title="حذف الدور"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    {selectedRole ? (
                        <Card title={`صلاحيات دور: ${selectedRole.name}`}>
                            <div className="space-y-6 p-4">
                                {PROTECTED_ROLES.includes(selectedRole.id) ? (
                                    <div className="text-center p-4 bg-slate-100 dark:bg-slate-700 rounded-md">
                                        <LockClosedIcon className="w-8 h-8 mx-auto text-slate-400 mb-2"/>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">صلاحيات هذا الدور مدمجة ولا يمكن تعديلها.</p>
                                        {selectedRole.id === 'gm' && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">المدير العام لديه كل الصلاحيات بشكل افتراضي.</p>}
                                    </div>
                                ) : (
                                    Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
                                        <div key={groupName}>
                                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">{groupName}</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                                {permissions.map(permission => (
                                                    <label key={permission} className="flex items-center space-x-3 rtl:space-x-reverse cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedRole.permissions?.includes(permission) || false}
                                                            onChange={() => handlePermissionToggle(permission)}
                                                            className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                                        />
                                                        <span className="text-sm text-slate-600 dark:text-slate-300">{PERMISSION_DESCRIPTIONS[permission]}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    ) : (
                        <Card>
                             <EmptyState
                                icon={<LockClosedIcon className="w-12 h-12" />}
                                title="إدارة الصلاحيات"
                                message="اختر دوراً من القائمة لعرض وتعديل صلاحياته."
                             />
                        </Card>
                    )}
                </div>
            </div>

            {isFormModalOpen && (
                <RoleFormModal 
                    isOpen={isFormModalOpen}
                    onClose={() => setIsFormModalOpen(false)}
                    onSave={handleSaveRole}
                    role={editingRole}
                />
            )}

            {roleToDelete && (
                <ConfirmationModal 
                    isOpen={!!roleToDelete}
                    onClose={() => setRoleToDelete(null)}
                    onConfirm={confirmDeleteRole}
                    title="تأكيد حذف الدور"
                    message={`هل أنت متأكد من رغبتك في حذف دور "${roleToDelete.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
                    isDestructive
                />
            )}
        </>
    );
};