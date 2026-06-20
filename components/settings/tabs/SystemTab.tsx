import React from "react";
import { SiteSettings } from "@shared/types";

interface Props {
  settings: Partial<SiteSettings>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SystemTab: React.FC<Props> = ({ settings, handleInputChange, handleNumberChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label
          htmlFor="currency"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          العملة
        </label>
        <input
          type="text"
          id="currency"
          name="currency"
          value={settings.currency || ""}
          onChange={handleInputChange}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          placeholder="e.g., EGP"
        />
      </div>
      <div>
        <label
          htmlFor="overtimeRateMultiplier"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          مضاعف سعر الساعة الإضافية
        </label>
        <input
          type="number"
          step="0.1"
          id="overtimeRateMultiplier"
          name="overtimeRateMultiplier"
          value={settings.overtimeRateMultiplier || ""}
          onChange={handleNumberChange}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>
      <div>
        <label
          htmlFor="logEditingDaysLimit"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          حد أيام تعديل السجلات
        </label>
        <input
          type="number"
          id="logEditingDaysLimit"
          name="logEditingDaysLimit"
          value={settings.logEditingDaysLimit || ""}
          onChange={handleNumberChange}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>
    </div>
  );
};
