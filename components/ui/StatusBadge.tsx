import React from "react";

type StatusType =
  | "project"
  | "task"
  | "approval"
  | "request"
  | "penalty"
  | "contract"
  | "plan"
  | "support_ticket_status"
  | "support_ticket_priority";
type StatusValue = string;

interface StatusBadgeProps {
  status: StatusValue;
  type: StatusType;
  inline?: boolean;
}

const statusMaps: Record<
  StatusType,
  Record<StatusValue, { text: string; className: string }>
> = {
  project: {
    نشط: {
      text: "نشط",
      className: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400",
    },
    مكتمل: {
      text: "مكتمل",
      className:
        "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400",
    },
    معلق: {
      text: "معلق",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
    },
  },
  task: {
    todo: {
      text: "لم تبدأ",
      className:
        "bg-slate-200 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300",
    },
    inprogress: {
      text: "قيد التنفيذ",
      className: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400",
    },
    done: {
      text: "مكتملة",
      className:
        "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400",
    },
  },
  approval: {
    pending: {
      text: "قيد المراجعة",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
    },
    approved: {
      text: "معتمدة",
      className:
        "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400",
    },
    rejected: {
      text: "مرفوضة",
      className: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400",
    },
    "needs-adjustment": {
      text: "تحتاج تعديل",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400",
    },
  },
  request: {
    // Generic for leave, expense, overtime
    pending: {
      text: "قيد المراجعة",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
    },
    approved: {
      text: "معتمد",
      className:
        "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400",
    },
    rejected: {
      text: "مرفوض",
      className: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400",
    },
  },
  penalty: {
    pending: {
      text: "قيد المراجعة",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
    },
    approved: {
      text: "معتمدة",
      className:
        "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400",
    },
    appealed: {
      text: "تم الاستئناف",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400",
    },
    rejected: {
      text: "مرفوضة",
      className: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400",
    },
  },
  contract: {
    pending: {
      text: "قيد المراجعة",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
    },
    approved: {
      text: "معتمد",
      className:
        "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400",
    },
    rejected: {
      text: "مرفوض",
      className: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400",
    },
  },
  plan: {
    pending: {
      text: "قيد المراجعة",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
    },
    approved: {
      text: "معتمدة",
      className:
        "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400",
    },
    rejected: {
      text: "مرفوضة",
      className: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400",
    },
    "needs-adjustment": {
      text: "تحتاج تعديل",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400",
    },
  },
  support_ticket_status: {
    open: {
      text: "مفتوحة",
      className:
        "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400",
    },
    "in-progress": {
      text: "قيد المعالجة",
      className: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400",
    },
    closed: {
      text: "مغلقة",
      className:
        "bg-slate-200 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300",
    },
  },
  support_ticket_priority: {
    low: {
      text: "منخفضة",
      className:
        "bg-slate-200 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300",
    },
    medium: {
      text: "متوسطة",
      className: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400",
    },
    high: {
      text: "عالية",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
    },
    urgent: {
      text: "عاجلة",
      className: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400",
    },
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type,
  inline,
}) => {
  const statusInfo = statusMaps[type]?.[status];

  if (!statusInfo) {
    return (
      <span
        className={
          inline
            ? ""
            : "px-2 py-1 text-xs font-medium rounded-full bg-slate-200 text-slate-800"
        }
      >
        {status}
      </span>
    );
  }

  const baseClasses = inline
    ? "font-medium"
    : "px-2 py-1 text-xs font-medium rounded-full";

  return (
    <span className={`${baseClasses} ${statusInfo.className}`}>
      {statusInfo.text}
    </span>
  );
};
