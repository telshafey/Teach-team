import React from 'react';
import { Modal } from '../ui/Modal';
import { DecisionItem } from '../../types';
// Add other necessary components here, e.g., for showing details of each item type.

interface DecisionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DecisionItem | null;
}

const renderItemDetails = (item: DecisionItem | null) => {
    if (!item) return null;

    // This can be expanded to show detailed views for each type of item
    return (
        <div>
            <h3 className="font-bold">تفاصيل الطلب</h3>
            <pre className="text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded mt-2 overflow-x-auto">
                {JSON.stringify(item, null, 2)}
            </pre>
            <p className="text-xs text-slate-500 mt-2">
                ملاحظة: هذه مجرد معاينة للبيانات. سيتم تنفيذ واجهة مفصلة لكل نوع من الطلبات.
            </p>
        </div>
    );
}

export const DecisionDetailModal: React.FC<DecisionDetailModalProps> = ({ isOpen, onClose, item }) => {
  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="مراجعة الطلب">
        {renderItemDetails(item)}
    </Modal>
  );
};
