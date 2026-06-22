import React from "react";
import { DecisionItem } from "@shared/types";
import {
  isTask,
  isProject,
  isOvertimeRequest,
  isLeaveRequest,
  isWorkContractChangeRequest,
  isPenalty,
  isTeamMember,
  isExpenseClaim,
} from "@shared/utils/typeGuards";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import { useSettingsContext } from "@shared/contexts/SettingsContext";

interface ApprovalItemCardProps {
  item: DecisionItem;
  onReview: (item: DecisionItem) => void;
}

export const ApprovalItemCard: React.FC<ApprovalItemCardProps> = React.memo(
  ({ item, onReview }) => {
    const { teamMembers } = useTeamContext();
    const { currency } = useSettingsContext();

    let title = "طلب غير معروف";
    let details = "";

    if (isTask(item)) {
      const member = teamMembers.find((m) => m.id === item.assignedTo);
      title = `تسليم مهمة: ${item.title}`;
      details = `بواسطة ${member?.name || "غير معروف"}`;
    } else if (isProject(item) && item.freelancerContract) {
      const member = teamMembers.find(
        (m) => m.id === item.freelancerContract?.freelancerId,
      );
      title = `عقد مستقل لمشروع: ${item.name}`;
      details = `المستقل: ${member?.name || "غير معروف"}`;
    } else if (isTeamMember(item)) {
      title = `خطة عمل أسبوعية لـ ${item.name}`;
      details = `الحالة: ${item.weeklyPlan?.status || "معلقة"}`;
    } else if (isOvertimeRequest(item)) {
      const member = teamMembers.find((m) => m.id === item.teamMemberId);
      title = `طلب ساعات إضافية`;
      details = `بواسطة ${member?.name || "غير معروف"}, ${item.requestedHours} ساعة`;
    } else if (isLeaveRequest(item)) {
      const member = teamMembers.find((m) => m.id === item.teamMemberId);
      title = `طلب إجازة`;
      details = `بواسطة ${member?.name || "غير معروف"}, من ${format(parseISO(item.startDate), "d MMM", { locale: arSA })} إلى ${format(parseISO(item.endDate), "d MMM", { locale: arSA })}`;
    } else if (isExpenseClaim(item)) {
      const member = teamMembers.find((m) => m.id === item.teamMemberId);
      title = `طلب صرف`;
      details = `بواسطة ${member?.name || "غير معروف"}, مبلغ ${item.amount} ${currency}`;
    } else if (isWorkContractChangeRequest(item)) {
      const member = teamMembers.find((m) => m.id === item.teamMemberId);
      title = `طلب تعديل عقد عمل`;
      details = `بواسطة ${member?.name || "غير معروف"}`;
    } else if (isPenalty(item)) {
      const member = teamMembers.find((m) => m.id === item.teamMemberId);
      title = `مراجعة جزاء`;
      details = `للموظف ${member?.name || "غير معروف"}`;
    }

    return (
      <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center">
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            {title}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {details}
          </p>
        </div>
        <button
          onClick={() => onReview(item)}
          className="text-sm font-semibold text-sky-600 hover:text-sky-800"
        >
          مراجعة
        </button>
      </div>
    );
  },
);
