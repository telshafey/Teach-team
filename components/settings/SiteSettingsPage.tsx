import React, { useState, useEffect, FormEvent, useRef, useMemo } from "react";
import { useSettingsContext } from "@shared/contexts/SettingsContext";
import { Card } from "../ui/Card";
import { SiteSettings, MeetingSettings } from "@shared/types";
import { useToast } from "@shared/contexts/ToastContext";
import { ConfirmationModal } from "../modals/ConfirmationModal";
import { useSupabase } from "@shared/contexts/SupabaseContext";

import { GeneralTab } from "./tabs/GeneralTab";
import { SystemTab } from "./tabs/SystemTab";
import { AuthTab } from "./tabs/AuthTab";
import { ModulesTab } from "./tabs/ModulesTab";
import { MeetingsTab } from "./tabs/MeetingsTab";

type Tab = "general" | "system" | "auth" | "modules" | "meetings";

export const SiteSettingsPage: React.FC = () => {
  const { siteSettings, handleUpdateSiteSettings } = useSettingsContext();
  const [settings, setSettings] = useState<Partial<SiteSettings>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("general");

  useEffect(() => {
    if (siteSettings) {
      setSettings(siteSettings);
    }
  }, [siteSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // For checkbox, we need to assert event target type to get checked property safely or cast
    const checked = (e.target as HTMLInputElement).checked;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value === "" ? undefined : Number(value),
    }));
  };

  const handleMeetingSettingsChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      meetingSettings: {
        ...(prev.meetingSettings as MeetingSettings),
        [name]: type === "checkbox" ? checked : value,
      },
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    try {
      await handleUpdateSiteSettings(settings as SiteSettings);
    } catch (error: any) {
      console.error("Failed to update site settings", error);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = useMemo(
    () =>
      [
        { id: "general", label: "عام" },
        { id: "system", label: "النظام" },
        { id: "auth", label: "شاشة الدخول" },
        { id: "modules", label: "إدارة الأقسام" },
        {
          id: "meetings",
          label: "الاجتماعات",
          show: settings.isMeetingsModuleEnabled,
        },
      ].filter((tab) => tab.show !== false),
    [settings.isMeetingsModuleEnabled],
  );

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-4 py-2 text-sm font-medium ${activeTab === tab.id ? "border-b-2 border-sky-500 text-sky-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card>
          <div className="p-4 space-y-6">
            {activeTab === "general" && (
              <GeneralTab settings={settings} setSettings={setSettings} handleInputChange={handleInputChange} />
            )}
            {activeTab === "system" && (
              <SystemTab settings={settings} handleInputChange={handleInputChange} handleNumberChange={handleNumberChange} />
            )}
            {activeTab === "auth" && (
              <AuthTab settings={settings} handleInputChange={handleInputChange} />
            )}
            {activeTab === "modules" && (
              <ModulesTab settings={settings} handleInputChange={handleInputChange} />
            )}
            {activeTab === "meetings" && siteSettings?.isMeetingsModuleEnabled && (
              <MeetingsTab settings={settings} handleMeetingSettingsChange={handleMeetingSettingsChange} />
            )}
          </div>
          <div className="flex justify-end p-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400"
            >
              {isSaving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
          </div>
        </Card>
      </form>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        title="تأكيد حفظ الإعدادات"
        message="هل أنت متأكد من رغبتك في حفظ هذه التغييرات؟"
      />
    </>
  );
};
