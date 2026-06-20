import React from "react";
import { SiteSettings } from "@shared/types";

interface Props {
  settings: Partial<SiteSettings>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ModulesTab: React.FC<Props> = ({ settings, handleInputChange }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <label className="flex items-center space-x-2 rtl:space-x-reverse">
        <input
          type="checkbox"
          name="isFinanceModuleEnabled"
          checked={settings.isFinanceModuleEnabled || false}
          onChange={handleInputChange}
          className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
        />{" "}
        <span>المالية</span>
      </label>
      <label className="flex items-center space-x-2 rtl:space-x-reverse">
        <input
          type="checkbox"
          name="isMeetingsModuleEnabled"
          checked={settings.isMeetingsModuleEnabled || false}
          onChange={handleInputChange}
          className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
        />{" "}
        <span>الاجتماعات</span>
      </label>
      <label className="flex items-center space-x-2 rtl:space-x-reverse">
        <input
          type="checkbox"
          name="isAnalyticsModuleEnabled"
          checked={settings.isAnalyticsModuleEnabled || false}
          onChange={handleInputChange}
          className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
        />{" "}
        <span>التحليلات</span>
      </label>
      <label className="flex items-center space-x-2 rtl:space-x-reverse">
        <input
          type="checkbox"
          name="isReportsModuleEnabled"
          checked={settings.isReportsModuleEnabled || false}
          onChange={handleInputChange}
          className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
        />{" "}
        <span>التقارير</span>
      </label>
    </div>
  );
};
