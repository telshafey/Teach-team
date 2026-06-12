import React, { useState, FormEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";

interface AppealPenaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appealReason: string) => Promise<void>;
}

export const AppealPenaltyModal: React.FC<AppealPenaltyModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    try {
      await onSave(reason);
      onClose();
    } catch (error) {
      console.error("Failed to submit appeal", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
        dir="rtl"
      >
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">
            تقديم استئناف على الجزاء
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1"
              >
                سبب الاستئناف
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                required
                placeholder="يرجى توضيح سبب اعتراضك على هذا الجزاء..."
              ></textarea>
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
                {isSaving ? "جارٍ الإرسال..." : "إرسال الاستئناف"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        title="تأكيد تقديم الاستئناف"
        message="هل أنت متأكد من رغبتك في تقديم هذا الاستئناف؟ سيتم إرساله إلى مديرك للمراجعة."
      />
    </>
  );
};
