import React, { useState } from "react";
import { useAuth } from "@shared/contexts/AuthContext";
import { ProfileSidebar } from "./ProfileSidebar";
import { ProfileRequests } from "./ProfileRequests";
import { ProfileSalaryReport } from "./ProfileSalaryReport";
import { ProfileWorkHours } from "./ProfileWorkHours";
import { ProfilePerformance } from "./ProfilePerformance";
import { ProfileSettings } from "./ProfileSettings";
import { ProfilePenalties } from "./ProfilePenalties";
import { LeaveRequestFormModal } from "../modals/LeaveRequestFormModal";
import { ExpenseClaimFormModal } from "../modals/ExpenseClaimFormModal";
import { OvertimeRequestFormModal } from "../modals/OvertimeRequestFormModal";
import { WorkContractChangeRequestModal } from "../modals/WorkContractChangeRequestModal";
import { AppealPenaltyModal } from "../modals/AppealPenaltyModal";
import { useRequestsContext } from "@shared/contexts/RequestsContext";
import { Penalty } from "@shared/types";

type ProfileTab =
  | "requests"
  | "performance"
  | "work_hours"
  | "salary"
  | "penalties"
  | "settings";

export const ProfilePage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    submitLeaveRequest,
    cancelLeaveRequest,
    submitOvertimeRequest,
    cancelOvertimeRequest,
    handleSubmitExpenseClaim,
    submitWorkContractChangeRequest,
    handleAppealPenalty,
  } = useRequestsContext();

  const [activeTab, setActiveTab] = useState<ProfileTab>("requests");
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
  const [isContractChangeModalOpen, setIsContractChangeModalOpen] =
    useState(false);
  const [appealingPenalty, setAppealingPenalty] = useState<Penalty | null>(
    null,
  );

  const isEmployee = currentUser?.roleId !== "freelancer";

  const handleCancelRequest = async (
    id: string,
    type: "leave" | "overtime",
  ) => {
    if (window.confirm("هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟")) {
      if (type === "leave") await cancelLeaveRequest(id);
      if (type === "overtime") await cancelOvertimeRequest(id);
    }
  };

  const handleSaveAppeal = async (appealReason: string) => {
    if (appealingPenalty) {
      await handleAppealPenalty(appealingPenalty.id, appealReason);
    }
  };

  const tabs = [
    { id: "requests", label: "طلباتي", show: true },
    { id: "performance", label: "ملخص الأداء", show: isEmployee },
    {
      id: "work_hours",
      label: "ساعات العمل",
      show: isEmployee && currentUser?.weeklyHoursRequirement,
    },
    {
      id: "salary",
      label: "تقرير الراتب",
      show: isEmployee && currentUser?.salary,
    },
    { id: "penalties", label: "الجزاءات", show: isEmployee },
    { id: "settings", label: "إعدادات الحساب", show: true },
  ].filter((t) => t.show);

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            الملف الشخصي
          </h2>
          <p className="text-md text-slate-500 dark:text-slate-400">
            إدارة معلوماتك وطلباتك وإعدادات حسابك.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <ProfileSidebar />
          </div>
          <div className="lg:col-span-3">
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
              <nav className="-mb-px flex space-x-6 rtl:space-x-reverse overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ProfileTab)}
                    className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? "border-sky-500 text-sky-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {activeTab === "requests" && (
              <ProfileRequests
                onNewLeave={() => setIsLeaveModalOpen(true)}
                onNewExpense={() => setIsExpenseModalOpen(true)}
                onNewOvertime={() => setIsOvertimeModalOpen(true)}
                onCancelRequest={handleCancelRequest}
              />
            )}
            {activeTab === "performance" && <ProfilePerformance />}
            {activeTab === "work_hours" && (
              <ProfileWorkHours
                onStartChangeRequest={() => setIsContractChangeModalOpen(true)}
              />
            )}
            {activeTab === "salary" && <ProfileSalaryReport />}
            {activeTab === "penalties" && (
              <ProfilePenalties onAppeal={setAppealingPenalty} />
            )}
            {activeTab === "settings" && <ProfileSettings />}
          </div>
        </div>
      </div>

      {isLeaveModalOpen && (
        <LeaveRequestFormModal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          onSave={submitLeaveRequest}
        />
      )}
      {isExpenseModalOpen && (
        <ExpenseClaimFormModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSave={handleSubmitExpenseClaim}
        />
      )}
      {isOvertimeModalOpen && (
        <OvertimeRequestFormModal
          isOpen={isOvertimeModalOpen}
          onClose={() => setIsOvertimeModalOpen(false)}
          onSave={submitOvertimeRequest}
        />
      )}
      {isContractChangeModalOpen && (
        <WorkContractChangeRequestModal
          isOpen={isContractChangeModalOpen}
          onClose={() => setIsContractChangeModalOpen(false)}
          onSave={submitWorkContractChangeRequest}
        />
      )}
      {appealingPenalty && (
        <AppealPenaltyModal
          isOpen={!!appealingPenalty}
          onClose={() => setAppealingPenalty(null)}
          onSave={handleSaveAppeal}
        />
      )}
    </>
  );
};
