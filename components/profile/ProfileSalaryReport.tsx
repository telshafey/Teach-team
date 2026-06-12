import React, { useMemo, useState } from "react";
import { useAuth } from "@shared/contexts/AuthContext";
import { useRequestsContext } from "@shared/contexts/RequestsContext";
import { useSettingsContext } from "@shared/contexts/SettingsContext";
import { Card } from "../ui/Card";
import {
  CurrencyDollarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../ui/Icons";
import {
  format,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isAfter,
} from "date-fns";
import { arSA } from "date-fns/locale";
import { generateSalarySlipData } from "@shared/utils/salarySlip";
import { SalarySlipModal } from "../modals/SalarySlipModal";
import { SalarySlipData } from "@shared/types";

export const ProfileSalaryReport: React.FC = () => {
  const { currentUser } = useAuth();
  const { overtimeRequests, expenseClaims, penalties } = useRequestsContext();
  const { currency, siteSettings } = useSettingsContext();
  const [viewedMonth, setViewedMonth] = useState(new Date());
  const [slipData, setSlipData] = useState<SalarySlipData | null>(null);

  const salaryReportData = useMemo(() => {
    if (!currentUser?.salary) return null;
    return generateSalarySlipData(
      currentUser,
      viewedMonth,
      overtimeRequests,
      expenseClaims,
      penalties,
      siteSettings,
    );
  }, [
    currentUser,
    overtimeRequests,
    expenseClaims,
    penalties,
    viewedMonth,
    siteSettings,
  ]);

  if (!salaryReportData) {
    return (
      <Card>
        <p className="p-4 text-center text-slate-500">
          لا توجد بيانات راتب لعرضها.
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card
        icon={<CurrencyDollarIcon className="w-5 h-5" />}
        title={`تقرير الراتب لشهر ${format(viewedMonth, "MMMM yyyy", { locale: arSA })}`}
        headerActions={
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewedMonth((prev) => subMonths(prev, 1))}
              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <ChevronRightIcon className="w-5 h-5 text-slate-500" />
            </button>
            <button
              onClick={() => setViewedMonth((prev) => addMonths(prev, 1))}
              disabled={
                isSameMonth(viewedMonth, new Date()) ||
                isAfter(viewedMonth, new Date())
              }
              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              <ChevronLeftIcon className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              الراتب الأساسي
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {salaryReportData.baseSalary.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {currency}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              قيمة الساعات الإضافية المعتمدة
            </span>
            <span className="font-bold text-green-600 dark:text-green-400">
              +{" "}
              {salaryReportData.overtimePay.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {currency}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              قيمة المصروفات المعتمدة
            </span>
            <span className="font-bold text-green-600 dark:text-green-400">
              +{" "}
              {salaryReportData.expensesReimbursed.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {currency}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/30 rounded-md">
            <span className="font-medium text-red-700 dark:text-red-300">
              الخصومات والجزاءات المعتمدة
            </span>
            <span className="font-bold text-red-600 dark:text-red-400">
              -{" "}
              {salaryReportData.penaltiesDeducted.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {currency}
            </span>
          </div>
          <div className="flex justify-between items-center p-4 border-t-2 border-dashed border-slate-300 dark:border-slate-600 mt-4">
            <span className="text-base font-bold text-slate-800 dark:text-slate-100">
              إجمالي الراتب المتوقع
            </span>
            <span className="text-lg font-extrabold text-sky-600 dark:text-sky-400">
              {salaryReportData.netSalary.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {currency}
            </span>
          </div>

          <div className="pt-4">
            <button
              onClick={() => setSlipData(salaryReportData)}
              className="w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              عرض قسيمة الراتب
            </button>
          </div>
        </div>
      </Card>
      <SalarySlipModal
        isOpen={!!slipData}
        onClose={() => setSlipData(null)}
        slipData={slipData}
      />
    </>
  );
};
