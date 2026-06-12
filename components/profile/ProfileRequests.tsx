import React, { useMemo } from "react";
import { useAuth } from "@shared/contexts/AuthContext";
import { useRequestsContext } from "@shared/contexts/RequestsContext";
import { useSettingsContext } from "@shared/contexts/SettingsContext";
import { Card } from "../ui/Card";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import { StatusBadge } from "../ui/StatusBadge";
import { LeaveType } from "@shared/types";

const RequestTable: React.FC<{
  title: string;
  data: any[];
  columns: { header: string; accessor: (row: any) => any }[];
  onNew: () => void;
}> = ({ title, data, columns, onNew }) => (
  <Card
    title={title}
    headerActions={
      <button onClick={onNew} className="text-sm font-semibold text-sky-600">
        + طلب جديد
      </button>
    }
  >
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right">
        <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
          <tr>
            {columns.map((c) => (
              <th key={c.header} className="px-4 py-2">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b dark:border-slate-700">
              {columns.map((c) => (
                <td key={c.header} className="px-4 py-2">
                  {c.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <p className="text-center text-slate-500 py-4">لا توجد طلبات.</p>
      )}
    </div>
  </Card>
);

interface ProfileRequestsProps {
  onNewLeave: () => void;
  onNewExpense: () => void;
  onNewOvertime: () => void;
  onCancelRequest: (id: string, type: "leave" | "overtime") => void;
}

export const ProfileRequests: React.FC<ProfileRequestsProps> = ({
  onNewLeave,
  onNewExpense,
  onNewOvertime,
  onCancelRequest,
}) => {
  const { currentUser } = useAuth();
  const { leaveRequests, expenseClaims, overtimeRequests } =
    useRequestsContext();
  const { currency } = useSettingsContext();

  const myData = useMemo(() => {
    if (!currentUser) return { leaves: [], expenses: [], overtimes: [] };
    return {
      leaves: leaveRequests
        .filter((r) => r.teamMemberId === currentUser.id)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      expenses: expenseClaims
        .filter((c) => c.teamMemberId === currentUser.id)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      overtimes: overtimeRequests
        .filter((o) => o.teamMemberId === currentUser.id)
        .sort(
          (a, b) =>
            new Date(b.weekStartDate).getTime() -
            new Date(a.weekStartDate).getTime(),
        ),
    };
  }, [leaveRequests, expenseClaims, overtimeRequests, currentUser]);

  const leaveTypeMap: Record<LeaveType, string> = {
    regular: "عادية",
    emergency: "طارئة",
    "work-from-home": "عمل من المنزل",
  };

  return (
    <div className="space-y-6">
      <RequestTable
        title="طلبات الإجازات"
        data={myData.leaves}
        onNew={onNewLeave}
        columns={[
          {
            header: "النوع",
            accessor: (r: any) => leaveTypeMap[r.type] || r.type,
          },
          {
            header: "من",
            accessor: (r: any) =>
              format(parseISO(r.startDate), "d MMM yyyy", { locale: arSA }),
          },
          {
            header: "إلى",
            accessor: (r: any) =>
              format(parseISO(r.endDate), "d MMM yyyy", { locale: arSA }),
          },
          {
            header: "الحالة",
            accessor: (r: any) => (
              <StatusBadge status={r.status} type="request" />
            ),
          },
          {
            header: "",
            accessor: (r: any) =>
              r.status === "pending" ? (
                <button
                  onClick={() => onCancelRequest(r.id, "leave")}
                  className="text-xs text-red-600 hover:underline"
                >
                  إلغاء
                </button>
              ) : null,
          },
        ]}
      />
      <RequestTable
        title="طلبات المصروفات"
        data={myData.expenses}
        onNew={onNewExpense}
        columns={[
          {
            header: "التاريخ",
            accessor: (r: any) =>
              format(parseISO(r.date), "d MMM yyyy", { locale: arSA }),
          },
          { header: "المبلغ", accessor: (r: any) => `${r.amount} ${currency}` },
          { header: "الوصف", accessor: (r: any) => r.description },
          {
            header: "الحالة",
            accessor: (r: any) => (
              <StatusBadge status={r.status} type="request" />
            ),
          },
        ]}
      />
      <RequestTable
        title="طلبات الساعات الإضافية"
        data={myData.overtimes}
        onNew={onNewOvertime}
        columns={[
          {
            header: "بداية الأسبوع",
            accessor: (r: any) =>
              format(parseISO(r.weekStartDate), "d MMM yyyy", { locale: arSA }),
          },
          {
            header: "الساعات المطلوبة",
            accessor: (r: any) => r.requestedHours,
          },
          {
            header: "الحالة",
            accessor: (r: any) => (
              <StatusBadge status={r.status} type="request" />
            ),
          },
          {
            header: "",
            accessor: (r: any) =>
              r.status === "pending" ? (
                <button
                  onClick={() => onCancelRequest(r.id, "overtime")}
                  className="text-xs text-red-600 hover:underline"
                >
                  إلغاء
                </button>
              ) : null,
          },
        ]}
      />
    </div>
  );
};
