import React, { useState, FormEvent, useEffect } from 'react';
import { MeetingFormData } from '../../types';
import { useAppDataContext } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

interface MeetingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meetingData: MeetingFormData) => Promise<void>;
}

export const MeetingFormModal: React.FC<MeetingFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const { teamMembers } = useAppDataContext();
  const { currentUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [participants, setParticipants] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Reset state when modal opens
    if (isOpen) {
        setTitle('');
        setDateTime('');
        // Automatically add the current user as a participant
        if (currentUser) {
            setParticipants(new Set([currentUser.id]));
        } else {
            setParticipants(new Set());
        }
    }
  }, [currentUser, isOpen]);


  if (!isOpen) return null;
  
  const handleParticipantChange = (memberId: number) => {
    // The current user cannot be unselected
    if (memberId === currentUser?.id) return;

    setParticipants(prev => {
        const newParticipants = new Set(prev);
        if (newParticipants.has(memberId)) {
            newParticipants.delete(memberId);
        } else {
            newParticipants.add(memberId);
        }
        return newParticipants;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        await onSave({
            title,
            scheduledTime: new Date(dateTime).toISOString(),
            participants: Array.from(participants)
        });
        onClose();
    } catch (error) {
        console.error("Failed to save meeting", error);
        // Error is handled in the context now, no need for toast here.
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100 flex-shrink-0">جدولة اجتماع جديد</h2>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">عنوان الاجتماع</label>
                    <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
                </div>
                <div>
                    <label htmlFor="dateTime" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الوقت والتاريخ</label>
                    <input type="datetime-local" id="dateTime" value={dateTime} onChange={e => setDateTime(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">المشاركون</label>
                    <div className="max-h-60 overflow-y-auto border border-slate-300 dark:border-slate-600 rounded-md p-2 space-y-2">
                    {teamMembers.map(member => (
                        <label key={member.id} className={`flex items-center space-x-3 rtl:space-x-reverse p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md ${member.id === currentUser?.id ? 'opacity-70' : 'cursor-pointer'}`}>
                        <input
                            type="checkbox"
                            checked={participants.has(member.id)}
                            onChange={() => handleParticipantChange(member.id)}
                            disabled={member.id === currentUser?.id}
                            className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 disabled:cursor-not-allowed"
                        />
                        <img src={member.avatarUrl} alt={member.name} className="w-8 h-8 rounded-full" />
                        <span className="text-sm text-slate-800 dark:text-slate-200">{member.name}</span>
                        </label>
                    ))}
                    </div>
                </div>
            </div>
            <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4 mt-auto flex-shrink-0">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">إلغاء</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                {isSaving ? 'جارٍ الحفظ...' : 'حفظ وجدولة'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};
