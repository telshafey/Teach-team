import React, { useState, FormEvent } from "react";
import { useAuth } from "@shared/contexts/AuthContext";
import { useToast } from "@shared/contexts/ToastContext";
import { Card } from "../ui/Card";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { fileToBase64 } from "@shared/utils/files";
import { useSettingsContext } from "@shared/contexts/SettingsContext";
import { CurrencyDollarIcon, ClockIcon } from "../ui/Icons";

export const ProfileSidebar: React.FC = () => {
  const { currentUser, updateCurrentUser } = useAuth();
  const { addToast } = useToast();
  const { currency } = useSettingsContext();
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState(currentUser?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || "");

  if (!currentUser) return null;

  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateCurrentUser({ name, avatarUrl });
      addToast("تم تحديث الملف الشخصي بنجاح.", "success");
    } catch (error: any) {
      addToast(`فشل تحديث الملف الشخصي: ${error.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        addToast("حجم الصورة يجب أن يكون أقل من 2 ميجابايت.", "error");
        return;
      }
      try {
        const base64 = await fileToBase64(file);
        setAvatarUrl(base64);
      } catch (err) {
        addToast("فشل في معالجة الصورة.", "error");
      }
    }
  };

  return (
    <Card>
      <form onSubmit={handleProfileUpdate} className="p-4 space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <img
            src={avatarUrl}
            alt={name}
            className="w-24 h-24 rounded-full object-cover ring-4 ring-sky-200 dark:ring-sky-800"
          />
          <label className="cursor-pointer px-3 py-1.5 text-sm font-semibold text-sky-700 bg-sky-100 rounded-md hover:bg-sky-200">
            <span>تغيير الصورة</span>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleAvatarChange}
            />
          </label>
        </div>
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            الاسم
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
            required
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            البريد الإلكتروني
          </label>
          <input
            type="email"
            id="email"
            value={currentUser.email}
            disabled
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-slate-100 dark:bg-slate-700 cursor-not-allowed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4 space-y-3">
          {currentUser.employmentType === "freelancer" ? (
            currentUser.hourlyRate != null && (
              <div className="flex items-center text-sm">
                <CurrencyDollarIcon className="w-5 h-5 text-slate-400 ml-2 rtl:ml-0 rtl:mr-2" />
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  سعر الساعة:
                </span>
                <span className="mr-auto font-bold text-slate-800 dark:text-slate-100">
                  {currentUser.hourlyRate.toLocaleString()} {currency}
                </span>
              </div>
            )
          ) : (
            <>
              {currentUser.salary != null && (
                <div className="flex items-center text-sm">
                  <CurrencyDollarIcon className="w-5 h-5 text-slate-400 ml-2 rtl:ml-0 rtl:mr-2" />
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    الراتب الشهري:
                  </span>
                  <span className="mr-auto font-bold text-slate-800 dark:text-slate-100">
                    {currentUser.salary.toLocaleString()} {currency}
                  </span>
                </div>
              )}
              {currentUser.weeklyHoursRequirement != null && (
                <div className="flex items-center text-sm">
                  <ClockIcon className="w-5 h-5 text-slate-400 ml-2 rtl:ml-0 rtl:mr-2" />
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    ساعات العمل الأسبوعية:
                  </span>
                  <span className="mr-auto font-bold text-slate-800 dark:text-slate-100">
                    {currentUser.weeklyHoursRequirement} ساعة
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400"
        >
          {isSaving ? <LoadingSpinner /> : "حفظ التغييرات"}
        </button>
      </form>
    </Card>
  );
};
