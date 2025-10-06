import React, { useState, FormEvent } from 'react';
import { MeetingFormData } from '../../types';
import { useAppDataContext } from '../../contexts/DataContext';

interface MeetingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MeetingFormData) => Promise<void>;
}

export const MeetingFormModal: React.FC<MeetingFormModalProps> = ({ isOpen, onClose, onSave }) => {
    const { teamMembers } = useAppDataContext();
    const [title, setTitle] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [participants, setParticipants] = useState<number[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({ title, scheduledTime: new Date(scheduledTime).toISOString(), participants });
            onClose();
        } catch (error) {
            console.error("Failed to save meeting", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleParticipantChange = (memberId: number) => {
        setParticipants(prev =>
            prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">جدولة اجتماع جديد</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">عنوان الاجتماع</label>
                        <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
                    </div>
                    <div>
                        <label htmlFor="scheduledTime" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">وقت الاجتماع</label>
                        <input type="datetime-local" id="scheduledTime" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">المشاركون</label>
                        <div className="max-h-40 overflow-y-auto border border-slate-300 dark:border-slate-600 rounded-md p-2 space-y-2">
                            {teamMembers.map(member => (
                                <label key={member.id} className="flex items-center space-x-3 rtl:space-x-reverse">
                                    <input type="checkbox" checked={participants.includes(member.id)} onChange={() => handleParticipantChange(member.id)} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                                    <span className="text-sm text-slate-700 dark:text-slate-200">{member.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">إلغاء</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                            {isSaving ? 'جارٍ الحفظ...' : 'حفظ'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
