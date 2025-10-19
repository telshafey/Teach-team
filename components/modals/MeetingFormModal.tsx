import React, { useState, FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { MeetingFormData, Project, TeamMember } from '../../types';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useTeamContext } from '../../contexts/TeamContext';

interface MeetingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: MeetingFormData) => Promise<void>;
  projects: Project[];
}

export const MeetingFormModal: React.FC<MeetingFormModalProps> = ({ isOpen, onClose, onSave, projects }) => {
  const { teamMembers } = useTeamContext();
  const [formData, setFormData] = useState<MeetingFormData>({
    title: '',
    members: [],
    startTime: new Date().toISOString().slice(0, 16),
    duration: 30,
    projectId: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save meeting:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMemberToggle = (memberId: number) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.includes(memberId)
        ? prev.members.filter(id => id !== memberId)
        : [...prev.members, memberId],
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="جدولة اجتماع جديد" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title">عنوان الاجتماع</label>
          <input type="text" id="title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required className="w-full p-2 mt-1 border rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startTime">وقت البدء</label>
            <input type="datetime-local" id="startTime" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} required className="w-full p-2 mt-1 border rounded-md" />
          </div>
          <div>
            <label htmlFor="duration">المدة (بالدقائق)</label>
            <input type="number" id="duration" value={formData.duration} onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })} required min="15" step="15" className="w-full p-2 mt-1 border rounded-md" />
          </div>
        </div>
        <div>
          <label htmlFor="project">المشروع (اختياري)</label>
          <select id="project" value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })} className="w-full p-2 mt-1 border rounded-md">
            <option value="">-- عام --</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label>المشاركون</label>
          <div className="mt-2 p-2 border rounded-md max-h-48 overflow-y-auto space-y-2">
            {teamMembers.map(member => (
              <label key={member.id} className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                <input type="checkbox" checked={formData.members.includes(member.id)} onChange={() => handleMemberToggle(member.id)} className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500" />
                <img src={member.avatarUrl} alt={member.name} className="w-6 h-6 rounded-full"/>
                <span>{member.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md bg-slate-100 hover:bg-slate-200">إلغاء</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
            {isSaving ? <LoadingSpinner /> : 'جدولة'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
