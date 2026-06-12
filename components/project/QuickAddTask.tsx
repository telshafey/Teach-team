import React, { useState, useRef, useEffect } from "react";
import { PlusIcon } from "../ui/Icons";

interface QuickAddTaskProps {
  onAdd: (title: string) => void;
}

export const QuickAddTask: React.FC<QuickAddTaskProps> = ({ onAdd }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isAdding) {
      textareaRef.current?.focus();
    }
  }, [isAdding]);

  const handleAdd = () => {
    if (title.trim()) {
      onAdd(title.trim());
      setTitle("");
      textareaRef.current?.focus(); // allow adding multiple tasks quickly
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === "Escape") {
      setIsAdding(false);
      setTitle("");
    }
  };

  if (isAdding) {
    return (
      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="أدخل عنواناً لهذه البطاقة..."
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm shadow-sm"
          rows={3}
        />
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700"
          >
            إضافة بطاقة
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className="p-1.5 text-slate-500 hover:text-slate-700"
            aria-label="إلغاء"
          >
            &times;
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="w-full flex items-center space-x-2 rtl:space-x-reverse p-2 text-sm text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
    >
      <PlusIcon className="w-4 h-4" />
      <span>إضافة بطاقة</span>
    </button>
  );
};
