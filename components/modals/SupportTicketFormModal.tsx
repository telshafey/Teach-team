import React, { useState, FormEvent } from "react";
import { useSupportContext } from "@shared/contexts/SupportContext";
import { TicketCategory, TicketPriority } from "@shared/types";

interface SupportTicketFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportTicketFormModal: React.FC<SupportTicketFormModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createTicket } = useSupportContext();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    category: "technical" as TicketCategory,
    priority: "medium" as TicketPriority,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await createTicket(formData);
      onClose();
    } catch (error) {
      // Error toast is handled in context
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">
          فتح تذكرة دعم جديدة
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium">
              الموضوع
            </label>
            <input
              type="text"
              id="subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              className="w-full p-2 border rounded-md"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium">
                الفئة
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as TicketCategory,
                  })
                }
                className="w-full p-2 border rounded-md"
              >
                <option value="technical">مشكلة تقنية</option>
                <option value="billing">الفواتير والدفع</option>
                <option value="general">استفسار عام</option>
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium">
                الأولوية
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as TicketPriority,
                  })
                }
                className="w-full p-2 border rounded-md"
              >
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
                <option value="urgent">عاجلة</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium">
              وصف المشكلة
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={5}
              className="w-full p-2 border rounded-md"
              required
            />
          </div>
          <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-md"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md disabled:bg-slate-400"
            >
              {isSaving ? "جارٍ الإرسال..." : "إرسال"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
