import React, { useState, useEffect, FormEvent } from "react";
import {
  TeamMember,
  Role,
  TeamMemberFormData,
  EmploymentType,
} from "@shared/types";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { useSettingsContext } from "@shared/contexts/SettingsContext";
import { Card } from "../ui/Card";

interface TeamMemberFormProps {
  onCancel: () => void;
  onSave: (
    formData: TeamMemberFormData,
    memberToUpdate: TeamMember | null,
  ) => Promise<void>;
  member: TeamMember | null;
}

export const TeamMemberForm: React.FC<TeamMemberFormProps> = ({
  onCancel,
  onSave,
  member,
}) => {
  const { roles, teamMembers } = useTeamContext();
  const { currency } = useSettingsContext();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<TeamMemberFormData>({
    name: "",
    email: "",
    password: "",
    roleId: "employee",
    reportsTo: undefined,
    avatarUrl: "https://api.dicebear.com/8.x/initials/svg?seed=New",
    employmentType: "full-time",
    salary: undefined,
    hourlyRate: undefined,
    weeklyHoursRequirement: undefined,
    daysOff: [],
  });

  const isEditing = !!member;

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || "",
        email: member.email || "",
        password: "",
        roleId: member.roleId || roles[0]?.id || "",
        reportsTo: member.reportsTo || undefined,
        avatarUrl:
          member.avatarUrl ||
          `https://api.dicebear.com/8.x/initials/svg?seed=${member.name}`,
        employmentType: member.employmentType || "full-time",
        salary: member.salary || undefined,
        hourlyRate: member.hourlyRate || undefined,
        weeklyHoursRequirement: member.weeklyHoursRequirement || undefined,
        daysOff: member.daysOff || [],
      });
    } else {
      setFormData({
        name: "",
        email: "",
        password: "",
        roleId: roles[0]?.id || "",
        reportsTo: undefined,
        avatarUrl: "https://api.dicebear.com/8.x/initials/svg?seed=New",
        employmentType: "full-time",
        salary: undefined,
        hourlyRate: undefined,
        weeklyHoursRequirement: undefined,
        daysOff: [],
      });
    }
  }, [member, roles]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const dataToSave: TeamMemberFormData = {
        ...formData,
        reportsTo: formData.reportsTo || undefined,
      };

      if (!isEditing && !dataToSave.password) {
        alert("Password is required for new members.");
        setIsSaving(false);
        return;
      }
      if (isEditing && dataToSave.password === "") {
        delete dataToSave.password;
      }
      await onSave(dataToSave, member);
      onCancel();
    } catch (error) {
      console.error("Failed to save team member", error);
    } finally {
      setIsSaving(false);
    }
  };

  const isFreelancer = formData.employmentType === "freelancer";

  const handleEmploymentTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newType = e.target.value as EmploymentType;
    setFormData((prev) => {
      if (newType === "freelancer") {
        return {
          ...prev,
          employmentType: newType,
          salary: undefined,
          weeklyHoursRequirement: undefined,
        };
      } else {
        return { ...prev, employmentType: newType, hourlyRate: undefined };
      }
    });
  };

  return (
    <Card title={isEditing ? "تعديل عضو" : "إضافة عضو جديد"}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              الاسم
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full p-2 border rounded-md dark:bg-slate-900 border-slate-300 dark:border-slate-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full p-2 border rounded-md dark:bg-slate-900 border-slate-300 dark:border-slate-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              الدور
            </label>
            <select
              value={formData.roleId}
              onChange={(e) =>
                setFormData({ ...formData, roleId: e.target.value })
              }
              className="w-full p-2 border rounded-md dark:bg-slate-900 border-slate-300 dark:border-slate-600"
            >
              {roles
                .filter((r) => r.id && r.name)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              المدير المباشر
            </label>
            <select
              value={formData.reportsTo || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  reportsTo: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              className="w-full p-2 border rounded-md dark:bg-slate-900 border-slate-300 dark:border-slate-600"
            >
              <option value="">-- لا يوجد --</option>
              {teamMembers
                .filter((m) => m.id !== member?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              نوع الدوام
            </label>
            <select
              value={formData.employmentType}
              onChange={handleEmploymentTypeChange}
              className="w-full p-2 border rounded-md dark:bg-slate-900 border-slate-300 dark:border-slate-600"
            >
              <option value="full-time">دوام كامل</option>
              <option value="part-time">دوام جزئي</option>
              <option value="freelancer">مستقل</option>
            </select>
          </div>
          {isFreelancer ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                سعر الساعة ({currency})
              </label>
              <input
                type="number"
                value={formData.hourlyRate || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hourlyRate: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                className="w-full p-2 border rounded-md dark:bg-slate-900 border-slate-300 dark:border-slate-600"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  الراتب الشهري ({currency})
                </label>
                <input
                  type="number"
                  value={formData.salary || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salary: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full p-2 border rounded-md dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  ساعات العمل الأسبوعية
                </label>
                <input
                  type="number"
                  value={formData.weeklyHoursRequirement || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weeklyHoursRequirement: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full p-2 border rounded-md dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                />
              </div>
            </>
          )}

          {!isEditing && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                كلمة المرور
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full p-2 border rounded-md dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                required
              />
            </div>
          )}
          {isEditing && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                كلمة مرور جديدة (اختياري)
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full p-2 border rounded-md dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                placeholder="اتركه فارغاً لعدم التغيير"
              />
            </div>
          )}
        </div>

        <div className="flex justify-start space-x-3 rtl:space-x-reverse pt-6 mt-6 border-t dark:border-slate-800">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 shadow-sm disabled:bg-slate-400"
          >
            {isSaving ? "جارٍ الحفظ..." : "حفظ"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 text-sm font-semibold rounded-md border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-600 shadow-sm"
          >
            إلغاء
          </button>
        </div>
      </form>
    </Card>
  );
};
