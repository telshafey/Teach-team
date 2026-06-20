import React from "react";
import { SiteSettings } from "@shared/types";

interface Props {
  settings: Partial<SiteSettings>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const AuthTab: React.FC<Props> = ({ settings, handleInputChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="loginTitle"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          العنوان الرئيسي لشاشة الدخول
        </label>
        <input
          type="text"
          id="loginTitle"
          name="loginTitle"
          value={settings.loginTitle || ""}
          onChange={handleInputChange}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          placeholder="مثال: إدارة أعمالك برؤية مستقبلية وأداء استثنائي."
        />
      </div>
      <div>
        <label
          htmlFor="loginSubtitle"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          النص الفرعي لشاشة الدخول
        </label>
        <textarea
          id="loginSubtitle"
          name="loginSubtitle"
          value={settings.loginSubtitle || ""}
          onChange={handleInputChange}
          rows={3}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          placeholder="مثال: منصة متكاملة تجمع فريقك، مهامك، ومشاريعك في مكان واحد، لتمنحك الوضوح والتركيز لتحقيق أهدافك بكفاءة عالية."
        />
      </div>
      <div>
        <label
          htmlFor="supportEmail"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          البريد الإلكتروني للدعم (تواصل مع الإدارة)
        </label>
        <input
          type="email"
          id="supportEmail"
          name="supportEmail"
          value={settings.supportEmail || ""}
          onChange={handleInputChange}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          placeholder="مثال: office@tech-bokra.com"
          dir="ltr"
        />
      </div>
    </div>
  );
};
