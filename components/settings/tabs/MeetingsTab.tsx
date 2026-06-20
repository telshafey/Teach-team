import React from "react";
import { SiteSettings } from "@shared/types";

interface Props {
  settings: Partial<SiteSettings>;
  handleMeetingSettingsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MeetingsTab: React.FC<Props> = ({ settings, handleMeetingSettingsChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="defaultMeetingRoom"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          اسم غرفة الاجتماعات الافتراضية
        </label>
        <input
          type="text"
          id="defaultMeetingRoom"
          name="defaultMeetingRoom"
          value={settings.meetingSettings?.defaultMeetingRoom || ""}
          onChange={handleMeetingSettingsChange}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>
      <div>
        <label
          htmlFor="wherebyHostRoomKey"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          مفتاح غرفة المضيف (Host Room Key)
        </label>
        <input
          type="password"
          id="wherebyHostRoomKey"
          name="wherebyHostRoomKey"
          value={settings.meetingSettings?.wherebyHostRoomKey || ""}
          onChange={handleMeetingSettingsChange}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center space-x-2 rtl:space-x-reverse">
          <input
            type="checkbox"
            name="startWithAudioMuted"
            checked={settings.meetingSettings?.startWithAudioMuted || false}
            onChange={handleMeetingSettingsChange}
            className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
          />{" "}
          <span>بدء الاجتماع مع كتم صوت المشاركين</span>
        </label>
        <label className="flex items-center space-x-2 rtl:space-x-reverse">
          <input
            type="checkbox"
            name="startWithVideoMuted"
            checked={settings.meetingSettings?.startWithVideoMuted || false}
            onChange={handleMeetingSettingsChange}
            className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
          />{" "}
          <span>بدء الاجتماع مع إيقاف كاميرا المشاركين</span>
        </label>
        <label className="flex items-center space-x-2 rtl:space-x-reverse">
          <input
            type="checkbox"
            name="hideChat"
            checked={settings.meetingSettings?.hideChat || false}
            onChange={handleMeetingSettingsChange}
            className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
          />{" "}
          <span>إخفاء نافذة الدردشة</span>
        </label>
        <label className="flex items-center space-x-2 rtl:space-x-reverse">
          <input
            type="checkbox"
            name="hidePeople"
            checked={settings.meetingSettings?.hidePeople || false}
            onChange={handleMeetingSettingsChange}
            className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
          />{" "}
          <span>إخفاء قائمة المشاركين</span>
        </label>
      </div>
    </div>
  );
};
