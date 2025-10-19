import React, { useState, FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { SupportTicket, TicketCategory, TicketPriority } from '../../types';
import { useSupportContext } from '../../contexts/SupportContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface SupportTicketFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportTicketFormModal: React.FC<SupportTicketFormModalProps> = ({ isOpen, onClose }) => {
  const { createTicket } = useSupportContext();
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'general' as TicketCategory,
    priority: 'medium' as TicketPriority,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await createTicket(formData);
      onClose();
    } catch (error) {
      // Toast is handled by context
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="فتح تذكرة دعم فني جديدة">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="subject" className="block text-sm font-medium">الموضوع</label>
          <input type="text" id="subject" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} required className="w-full p-2 mt-1 border rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium">الفئة</label>
            <select id="category" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as TicketCategory })} className="w-full p-2 mt-1 border rounded-md">
              <option value="technical">تقني</option>
              <option value="billing">مالي</option>
              <option value="general">عام</option>
            </select>
          </div>
          <div>
            <label htmlFor="priority" className="block text-sm font-medium">الأولوية</label>
            <select id="priority" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as TicketPriority })} className="w-full p-2 mt-1 border rounded-md">
              <option value="low">منخفضة</option>
              <option value="medium">متوسطة</option>
              <option value="high">عالية</option>
              <option value="urgent">عاجلة</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium">الوصف</label>
          <textarea id="description" rows={5} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required className="w-full p-2 mt-1 border rounded-md" />
        </div>
        <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-slate-100">إلغاء</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm text-white bg-sky-600 rounded-md">
            {isSaving ? <LoadingSpinner /> : 'إرسال التذكرة'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
