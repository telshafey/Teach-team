import React, { useState, lazy, useMemo, Suspense } from "react";
import { SiteSettingsPage } from "./SiteSettingsPage";
import { RoleManagementPage } from "./RoleManagementPage";
import { View } from "@shared/navigation.types";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { Card } from "../ui/Card";
import { LockClosedIcon } from "../ui/Icons";
import { useNavigation } from "@shared/contexts/NavigationContext";
import { useTeamContext } from "@shared/contexts/TeamContext";

interface SettingsPageProps {
  initialView?: View;
  initialProps?: any;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  initialView,
  initialProps,
}) => {
  const { onNavigate } = useNavigation();
  const { hasPermission } = useTeamContext();

  const canManageSite = hasPermission("manage_site_settings");
  const canManageRoles = hasPermission("manage_roles");

  const availableTabs = useMemo(() => {
    const tabs: string[] = [];
    if (canManageSite) tabs.push("site");
    if (canManageRoles) tabs.push("roles");
    return tabs;
  }, [canManageSite, canManageRoles]);

  const getInitialTab = () => {
    const initialTab = initialView === "roles" ? "roles" : "site";
    if (availableTabs.includes(initialTab)) {
      return initialTab;
    }
    return availableTabs[0] || "";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  if (availableTabs.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <div className="p-8 text-center">
            <LockClosedIcon className="w-12 h-12 mx-auto text-red-500" />
            <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">
              وصول مرفوض
            </h2>
            <p className="mt-2 text-md text-slate-500 dark:text-slate-400">
              ليس لديك الصلاحية للوصول إلى أي من أقسام الإعدادات.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          الإعدادات
        </h2>
        <p className="text-md text-slate-500 dark:text-slate-400">
          إدارة إعدادات النظام والأدوار.
        </p>
      </div>
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
        {canManageSite && (
          <button
            onClick={() => setActiveTab("site")}
            className={`px-4 py-2 text-sm font-medium ${activeTab === "site" ? "border-b-2 border-sky-500 text-sky-600" : "text-slate-500 hover:text-slate-700"}`}
          >
            إعدادات الموقع
          </button>
        )}
        {canManageRoles && (
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-2 text-sm font-medium ${activeTab === "roles" ? "border-b-2 border-sky-500 text-sky-600" : "text-slate-500 hover:text-slate-700"}`}
          >
            الأدوار والصلاحيات
          </button>
        )}
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center p-8">
            <LoadingSpinner />
          </div>
        }
      >
        {activeTab === "site" && canManageSite && <SiteSettingsPage />}
        {activeTab === "roles" && canManageRoles && (
          <RoleManagementPage initialRoleId={initialProps?.initialRoleId} />
        )}
      </Suspense>
    </div>
  );
};
