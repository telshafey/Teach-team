import React, { useState, FormEvent, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Role } from '../../types';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleData: { id?: string, name: string }) => Promise<void>;
  role: Role | null;
}

export const RoleFormModal: React.FC<RoleFormModalProps> = ({ isOpen, onClose, onSave, role }) => {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!role;

  useEffect(() => {
    if (role) {
      setName(role.name);
    } else {
      setName('');
    }
  }, [role, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({ id: role?.id, name });
      onClose();
    } catch (error) {
      console.error('Failed to save role:', error);
      // Toast will be shown by the context
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'تعديل اسم الدور' : 'إضافة دور جديد'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="roleName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">اسم الدور</label>
          <input
            type="text"
            id="roleName"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full p-2 mt-1 border border-slate-300 dark:border-slate-600 rounded-md"
            required
            autoFocus
          />
        </div>
        <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600">إلغاء</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
            {isSaving ? <LoadingSpinner /> : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
