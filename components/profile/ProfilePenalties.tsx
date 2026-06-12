import React, { useMemo } from "react";
import { useAuth } from "@shared/contexts/AuthContext";
import { useRequestsContext } from "@shared/contexts/RequestsContext";
import { useSettingsContext } from "@shared/contexts/SettingsContext";
import { Card } from "../ui/Card";
import { NoSymbolIcon } from "../ui/Icons";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import { Penalty, PenaltyStatus } from "@shared/types";
import { StatusBadge } from "../ui/StatusBadge";

interface ProfilePenaltiesProps {
  onAppeal: (penalty: Penalty) => void;
}

export const ProfilePenalties: React.FC<ProfilePenaltiesProps> = ({
  onAppeal,
}) => {
  const { currentUser } = useAuth();
  const { penalties } = useRequestsContext();
  const { currency } = useSettingsContext();

  const myPenalties = useMemo(() => {
    if (!currentUser) return [];
    return penalties
      .filter((p) => p.teamMemberId === currentUser.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [penalties, currentUser]);

  return (
    <Card title="سجل الجزاءات" icon={<NoSymbolIcon className="w-5 h-5" />}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <th className="px-4 py-2">التاريخ</th>
              <th className="px-4 py-2">المبلغ ({currency})</th>
              <th className="px-4 py-2">السبب</th>
              <th className="px-4 py-2">الحالة</th>
              <th className="px-4 py-2">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {myPenalties.map((p) => (
              <tr key={p.id} className="border-b dark:border-slate-700">
                <td className="px-4 py-2">
                  {format(parseISO(p.date), "d MMM yyyy", { locale: arSA })}
                </td>
                <td className="px-4 py-2">{p.amount}</td>
                <td className="px-4 py-2">{p.reason}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={p.status} type="penalty" />
                </td>
                <td className="px-4 py-2">
                  {p.status === "approved" && (
                    <button
                      onClick={() => onAppeal(p)}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      استئناف
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {myPenalties.length === 0 && (
          <p className="text-center text-slate-500 py-4">
            لا توجد جزاءات مسجلة.
          </p>
        )}
      </div>
    </Card>
  );
};
