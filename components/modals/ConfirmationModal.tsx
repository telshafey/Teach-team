import React from 'react';
import { Modal } from '../ui/Modal';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isConfirming?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  isDestructive = false,
  isConfirming = false,
}) => {
  const confirmButtonClasses = isDestructive
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-sky-600 hover:bg-sky-700';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="text-sm text-slate-600 dark:text-slate-300">{message}</div>
      <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-6">
        <button
          type="button"
          onClick={onClose}
          disabled={isConfirming}
          className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isConfirming}
          className={`flex justify-center items-center px-4 py-2 text-sm font-semibold text-white rounded-md disabled:bg-slate-400 min-w-[6rem] ${confirmButtonClasses}`}
        >
          {isConfirming ? <LoadingSpinner /> : confirmText}
        </button>
      </div>
    </Modal>
  );
};
