import React, { useState, useEffect, FormEvent } from 'react';
import { Role } from '../../types';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleData: { id?: string, name: string }) => Promise<void>;
  role: Role | null;
}

export const RoleFormModal: React.FC<RoleFormModalProps> = ({ isOpen, onClose, onSave, role }) => {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (role) {
      setName(role.name);
    } else {
      setName('');
    }
  }, [role, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave({ id: role?.id, name });
      onClose();
    } catch (error) {
      console.error("Failed to save role", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">
          {role ? 'تعديل اسم الدور' : 'إضافة دور جديد'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="roleName" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              اسم الدور
            </label>
            <input
              type="text"
              id="roleName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
              required
            />
          </div>
          <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400"
            >
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};