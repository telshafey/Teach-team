import React, { useState, FormEvent, useMemo, useEffect } from 'react';
import { MeetingFormData, Project } from '../../types';
import { useTeamContext } from '../../contexts/TeamContext';
import { useToast } from '../../contexts/ToastContext';
import { SearchIcon } from '../ui/Icons';
import { format } from 'date-fns';

interface MeetingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MeetingFormData) => Promise<void>;
  projects: Project[];
}

export const MeetingFormModal: React.FC<MeetingFormModalProps> = ({ isOpen, onClose, onSave, projects }) => {
    const { teamMembers } = useTeamContext();
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        title: '',
        members: [] as number[],
        startTime: '',
        duration: '30', // Default duration 30 minutes
        projectId: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [participantSearch, setParticipantSearch] = useState('');
    
    useEffect(() => {
        if(isOpen) {
            // Set default start time to now, formatted for datetime-local input
            const now = new Date();
            now.setSeconds(0);
            now.setMilliseconds(0);
            setFormData(prev => ({...prev, title: '', members: [], projectId: '', startTime: format(now, "yyyy-MM-dd'T'HH:mm")}));
        }
    }, [isOpen]);

    if (!isOpen) return null;
    
    const filteredMembers = useMemo(() => {
        if (!participantSearch) return teamMembers;
        return teamMembers.filter(member => 
            member.name.toLowerCase().includes(participantSearch.toLowerCase())
        );
    }, [teamMembers, participantSearch]);
    
    const durationOptions = [5, 15, 30, 45];

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        if (new Date(formData.startTime) < new Date()) {
            addToast('لا يمكن جدولة اجتماع في وقت قد مضى.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            await onSave({ 
                ...formData,
                duration: parseInt(formData.duration, 10),
                projectId: formData.projectId || undefined,
            });
            onClose();
        } catch (error: any) {
            addToast(error.message || 'فشل جدولة الاجتماع. يرجى المحاولة مرة أخرى.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleParticipantChange = (memberId: number) => {
        setFormData(prev => ({
            ...prev,
            members: prev.members.includes(memberId) 
                ? prev.members.filter(id => id !== memberId) 
                : [...prev.members, memberId]
        }));
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">جدولة اجتماع جديد</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">عنوان الاجتماع</label>
                        <input type="text" id="title" name="title" value={formData.title} onChange={handleInputChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="startTime" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">وقت البدء</label>
                            <input type="datetime-local" id="startTime" name="startTime" value={formData.startTime} onChange={handleInputChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
                        </div>
                        <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">المدة (بالدقائق)</label>
                            <select id="duration" name="duration" value={formData.duration} onChange={handleInputChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                                {durationOptions.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="projectId" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">المشروع (اختياري)</label>
                        <select id="projectId" name="projectId" value={formData.projectId} onChange={handleInputChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                            <option value="">اجتماع عام</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">المشاركون</label>
                        <div className="relative mb-2">
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <SearchIcon className="w-5 h-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="بحث عن مشارك..."
                                value={participantSearch}
                                onChange={e => setParticipantSearch(e.target.value)}
                                className="w-full p-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"
                            />
                        </div>
                        <div className="max-h-40 overflow-y-auto border border-slate-300 dark:border-slate-600 rounded-md p-2 space-y-2">
                            {filteredMembers.map(member => (
                                <label key={member.id} className="flex items-center space-x-3 rtl:space-x-reverse">
                                    <input type="checkbox" checked={formData.members.includes(member.id)} onChange={() => handleParticipantChange(member.id)} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
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