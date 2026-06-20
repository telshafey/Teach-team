import React, { useRef, useState } from "react";
import { SiteSettings } from "@shared/types";
import { useSupabase } from "@shared/contexts/SupabaseContext";
import { useToast } from "@shared/contexts/ToastContext";
import { LoadingSpinner } from "../../ui/LoadingSpinner";
import { ArrowUpTrayIcon } from "../../ui/Icons";

interface Props {
  settings: Partial<SiteSettings>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setSettings: React.Dispatch<React.SetStateAction<Partial<SiteSettings>>>;
}

export const GeneralTab: React.FC<Props> = ({ settings, handleInputChange, setSettings }) => {
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { supabaseClient } = useSupabase();
  const { addToast } = useToast();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!supabaseClient) return;

    if (e.target.files && e.target.files[0]) {
      setIsUploadingLogo(true);
      const file = e.target.files[0];

      try {
        const filePath = `public/logo`;
        const { error } = await supabaseClient.storage
          .from("site_assets")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (error) throw error;

        const { data } = supabaseClient.storage
          .from("site_assets")
          .getPublicUrl(filePath);

        const publicUrlWithCacheBust = `${data.publicUrl}?t=${new Date().getTime()}`;

        setSettings((prev) => ({ ...prev, logoUrl: publicUrlWithCacheBust }));
        addToast('تم رفع الشعار بنجاح. اضغط "حفظ" لتطبيق التغيير.', "success");
      } catch (error: any) {
        console.error("Error uploading logo:", error);
        addToast(`فشل رفع الشعار: ${error.message}`, "error");
      } finally {
        setIsUploadingLogo(false);
        if (e.target) e.target.value = "";
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="appName"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          اسم التطبيق
        </label>
        <input
          type="text"
          id="appName"
          name="appName"
          value={settings.appName || ""}
          onChange={handleInputChange}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          الشعار
        </label>
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          {settings.logoUrl && (
            <img
              src={settings.logoUrl}
              alt="Logo preview"
              className="h-12 w-12 object-contain rounded-md bg-slate-100 dark:bg-slate-700 p-1"
            />
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleLogoUpload}
            className="hidden"
            accept="image/png, image/jpeg, image/svg+xml"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingLogo}
            className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 text-sm font-semibold text-sky-700 bg-sky-100 rounded-md hover:bg-sky-200 disabled:bg-slate-200"
          >
            {isUploadingLogo ? (
              <LoadingSpinner className="text-sky-600" />
            ) : (
              <ArrowUpTrayIcon className="w-4 h-4" />
            )}
            <span>
              {isUploadingLogo ? "جارٍ الرفع..." : "تغيير الشعار"}
            </span>
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          ملاحظة: يتطلب رفع الملفات إعداد مخزن (bucket) باسم
          `site_assets` في Supabase.
        </p>
      </div>
    </div>
  );
};
