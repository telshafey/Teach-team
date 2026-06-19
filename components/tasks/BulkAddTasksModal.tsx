import React, { useState } from "react";
import { XMarkIcon } from "../ui/Icons";
import { TaskStatus } from "@shared/types";

interface BulkAddTasksModalProps {
  onClose: () => void;
  onSave: (tasks: { title: string; description?: string }[]) => Promise<void>;
  isSaving: boolean;
}

export const BulkAddTasksModal: React.FC<BulkAddTasksModalProps> = ({
  onClose,
  onSave,
  isSaving,
}) => {
  const [tasksText, setTasksText] = useState("");

  const handleSave = async () => {
    if (!tasksText.trim()) return;

    // Parse tasks: empty line separates tasks, first line of a block is title, rest is description
    const rawBlocks = tasksText.split(/\n\s*\n/);
    const tasksToCreate = rawBlocks
      .map((block) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return null;
        return {
          title: lines[0],
          description: lines.slice(1).join("\n"),
        };
      })
      .filter((t): t is { title: string; description: string } => t !== null);

    if (tasksToCreate.length === 0) return;

    await onSave(tasksToCreate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            إضافة مهام متعددة
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-500 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            يرجى إدخال المهام. افصل بين كل مهمة والتي تليها بسطر فارغ. 
            السطر الأول سيكون عنوان المهمة، وباقي الأسطر ستكون الوصف التفصيلي.
          </p>
          <textarea
            value={tasksText}
            onChange={(e) => setTasksText(e.target.value)}
            className="w-full h-64 p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-shadow resize-none"
            placeholder={`مهمة 1
هذا وصف تفصيلي للمهمة الأولى.

مهمة 2
هذا وصف تفصيلي يعود للمهمة الثانية.`}
          />
        </div>
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !tasksText.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 flex items-center"
          >
            {isSaving ? "جاري الإضافة..." : "حفظ المهام"}
          </button>
        </div>
      </div>
    </div>
  );
};
