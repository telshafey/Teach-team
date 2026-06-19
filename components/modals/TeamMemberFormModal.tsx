import React, { useState, useEffect, FormEvent } from "react";
import {
  TeamMember,
  Role,
  TeamMemberFormData,
  EmploymentType,
} from "@shared/types";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { useSettingsContext } from "@shared/contexts/SettingsContext";

interface TeamMemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    formData: TeamMemberFormData,
    memberToUpdate: TeamMember | null,
  ) => Promise<void>;
  member: TeamMember | null;
}

export const TeamMemberFormModal: React.FC<TeamMemberFormModalProps> = ({
  isOpen,
  onClose,
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
  }, [member, isOpen, roles]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const dataToSave: TeamMemberFormData = {
        ...formData,
        reportsTo: formData.reportsTo || undefined,
      };

      if (!isEditing && !dataToSave.password) {
        alert("كلمة المرور مطلوبة للموظفين الجدد.");
        setIsSaving(false);
        return;
      }
      if (isEditing && dataToSave.password === "") {
        delete dataToSave.password;
      }
      await onSave(dataToSave, member);
      onClose();
    } catch (error) {
      // Error toast is handled in the context
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
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[calc(var(--vh,1vh)*90)] flex flex-col">
        <h2 className="text-xl font-bold mb-6 flex-shrink-0">
          {isEditing ? "تعديل عضو" : "إضافة عضو جديد"}
        </h2>
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto pr-2 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">الاسم</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">الدور</label>
              <select
                value={formData.roleId}
                onChange={(e) =>
                  setFormData({ ...formData, roleId: e.target.value })
                }
                className="w-full p-2 border rounded-md"
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
              <label className="block text-sm font-medium">
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
                className="w-full p-2 border rounded-md"
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
              <label className="block text-sm font-medium">نوع الدوام</label>
              <select
                value={formData.employmentType}
                onChange={handleEmploymentTypeChange}
                className="w-full p-2 border rounded-md"
              >
                <option value="full-time">دوام كامل</option>
                <option value="part-time">دوام جزئي</option>
                <option value="freelancer">مستقل</option>
              </select>
            </div>
            {isFreelancer ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    طريقة المحاسبة للمستقل
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 rtl:space-x-reverse">
                      <input
                        type="radio"
                        name="freelancerRateType"
                        checked={
                          formData.hourlyRate !== undefined &&
                          formData.hourlyRate !== null &&
                          formData.hourlyRate > 0
                        }
                        onChange={() =>
                          setFormData({ ...formData, hourlyRate: 10 })
                        }
                        className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                      />
                      <span>حسب عدد ساعات العمل (بالساعة)</span>
                    </label>
                    <label className="flex items-center space-x-2 rtl:space-x-reverse">
                      <input
                        type="radio"
                        name="freelancerRateType"
                        checked={
                          !formData.hourlyRate || formData.hourlyRate <= 0
                        }
                        onChange={() =>
                          setFormData({ ...formData, hourlyRate: undefined })
                        }
                        className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                      />
                      <span>وفقاً للمشروع / المهام (عقد ثابت)</span>
                    </label>
                  </div>
                </div>

                {formData.hourlyRate !== undefined &&
                  formData.hourlyRate !== null &&
                  formData.hourlyRate > 0 && (
                    <div>
                      <label className="block text-sm font-medium">
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
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                  )}
                {(!formData.hourlyRate || formData.hourlyRate <= 0) && (
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded text-sm text-slate-600 dark:text-slate-300">
                    يتم تحديد قيمة مخصصات المستقل عند تعيينه في مشاريع محددة من
                    خلال (المالية &gt; عقود المستقلين).
                  </div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium">
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
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
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
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </>
            )}

            {!isEditing && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium">كلمة المرور</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
            )}
            {isEditing && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium">
                  كلمة مرور جديدة (اختياري)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full p-2 border rounded-md"
                  placeholder="اتركه فارغاً لعدم التغيير"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-6 mt-auto flex-shrink-0 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-md"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md disabled:bg-slate-400"
            >
              {isSaving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
