import React, { useState } from "react";
import { TeamMember, Role } from "@shared/types";
import { Card } from "../ui/Card";
import { useSettingsContext } from "@shared/contexts/SettingsContext";
import {
  BriefcaseIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  PencilIcon,
  TrashIcon,
} from "../ui/Icons";
import { ConfirmationModal } from "../modals/ConfirmationModal";

interface MemberInfoCardProps {
  member: TeamMember;
  role: Role | undefined;
  manager: TeamMember | undefined;
  onEdit: (member: TeamMember) => void;
  onDelete?: (memberId: number) => void;
  canEdit: boolean;
}

export const MemberInfoCard: React.FC<MemberInfoCardProps> = ({
  member,
  role,
  manager,
  onEdit,
  onDelete,
  canEdit,
}) => {
  const { currency } = useSettingsContext();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const employmentTypeMap: Record<TeamMember["employmentType"], string> = {
    "full-time": "دوام كامل",
    "part-time": "دوام جزئي",
    freelancer: "مستقل",
  };
  const employmentType = employmentTypeMap[member.employmentType] || "غير محدد";

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(member.id);
    }
    setIsDeleteModalOpen(false);
  };

  return (
    <Card
      title="معلومات الموظف"
      headerActions={
        canEdit && (
          <div className="flex space-x-2 rtl:space-x-reverse">
            <button
              onClick={() => onEdit(member)}
              className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 text-xs font-semibold text-sky-700 bg-sky-100 rounded-md hover:bg-sky-200"
            >
              <PencilIcon className="w-3 h-3" />
              <span>تعديل</span>
            </button>
            {onDelete && (
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-md hover:bg-red-200"
              >
                <TrashIcon className="w-3 h-3" />
                <span>حذف</span>
              </button>
            )}
          </div>
        )
      }
    >
      <div className="flex flex-col items-center space-y-4">
        <img
          src={member.avatarUrl}
          alt={member.name}
          className="w-24 h-24 rounded-full object-cover ring-4 ring-sky-200 dark:ring-sky-800"
        />
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {member.name}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {role?.name}
          </p>
          {manager && (
            <p className="text-xs mt-2 text-slate-400">
              المدير المباشر: {manager.name}
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-slate-200 dark:border-slate-700 my-4"></div>
      <div className="space-y-4 text-sm">
        <div className="flex items-center">
          <EnvelopeIcon className="w-5 h-5 text-slate-400 ml-3 rtl:ml-0 rtl:mr-3 flex-shrink-0" />
          <span className="text-slate-600 dark:text-slate-300 break-all">
            {member.email}
          </span>
        </div>
        <div className="flex items-center">
          <BriefcaseIcon className="w-5 h-5 text-slate-400 ml-3 rtl:ml-0 rtl:mr-3" />
          <span className="text-slate-600 dark:text-slate-300">
            نوع الدوام:
          </span>
          <span className="font-semibold mr-auto rtl:mr-0 rtl:ml-auto">
            {employmentType}
          </span>
        </div>
        {member.employmentType !== "freelancer" &&
          member.weeklyHoursRequirement != null && (
            <div className="flex items-center">
              <ClockIcon className="w-5 h-5 text-slate-400 ml-3 rtl:ml-0 rtl:mr-3" />
              <span className="text-slate-600 dark:text-slate-300">
                ساعات العمل الأسبوعية:
              </span>
              <span className="font-semibold mr-auto rtl:mr-0 rtl:ml-auto">
                {member.weeklyHoursRequirement} ساعة
              </span>
            </div>
          )}
        {member.employmentType === "freelancer"
          ? member.hourlyRate != null && (
              <div className="flex items-center">
                <CurrencyDollarIcon className="w-5 h-5 text-slate-400 ml-3 rtl:ml-0 rtl:mr-3" />
                <span className="text-slate-600 dark:text-slate-300">
                  سعر الساعة:
                </span>
                <span className="font-semibold mr-auto rtl:mr-0 rtl:ml-auto">
                  {member.hourlyRate.toLocaleString()} {currency}
                </span>
              </div>
            )
          : member.salary != null && (
              <div className="flex items-center">
                <CurrencyDollarIcon className="w-5 h-5 text-slate-400 ml-3 rtl:ml-0 rtl:mr-3" />
                <span className="text-slate-600 dark:text-slate-300">
                  الراتب الشهري:
                </span>
                <span className="font-semibold mr-auto rtl:mr-0 rtl:ml-auto">
                  {member.salary.toLocaleString()} {currency}
                </span>
              </div>
            )}
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="تأكيد حذف الموظف"
        message={`هل أنت متأكد من رغبتك في حذف ${member.name}؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف الموظف"
        isDestructive={true}
      />
    </Card>
  );
};
