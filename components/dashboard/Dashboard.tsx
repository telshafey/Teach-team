import React, { useState, useEffect } from "react";
import { Sidebar } from "../shared/Sidebar";
import { Header } from "../shared/Header";
import { useAuth } from "@shared/contexts/AuthContext";
import { ActiveTimerBar } from "../shared/ActiveTimerBar";
import { PunchClockBar } from "../shared/PunchClockBar";
import { LogFormModal } from "../modals/LogFormModal";
import { useTimeLogContext } from "@shared/contexts/TimeLogContext";
import { BottomNavBar } from "./BottomNavBar";
import { View } from "@shared/navigation.types";
import { useNavigation } from "@shared/contexts/NavigationContext";
import { useTimeManagement } from "@shared/contexts/TimeManagementContext";
import { ErrorBoundary } from "../ui/ErrorBoundary";

interface DashboardProps {
  currentView: View;
  viewProps?: any;
  children?: React.ReactNode;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentView,
  children,
}) => {
  const { currentUser } = useAuth();
  const { onNavigate } = useNavigation();
  const {
    showLogModalFor,
    closeLogModal,
    showPunchOutLogModal,
    closePunchOutLogModal,
  } = useTimeManagement();
  const { handleAddDailyLog } = useTimeLogContext();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [currentView]);

  useEffect(() => {
    const setVh = () => {
      const vh = (window.visualViewport?.height || window.innerHeight) * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", setVh);
    }
    window.addEventListener("resize", setVh);

    setVh();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", setVh);
      }
      window.removeEventListener("resize", setVh);
    };
  }, []);

  const handleSaveLogFromTimer = async (logData: any) => {
    if (!currentUser || !showLogModalFor) return;
    await handleAddDailyLog({
      ...logData,
      teamMemberId: currentUser.id,
      date: new Date().toISOString().split("T")[0],
    });
    closeLogModal();
  };

  const handleSaveLogFromPunchOut = async (logData: any) => {
    if (!currentUser || !showPunchOutLogModal) return;
    await handleAddDailyLog({
      ...logData,
      teamMemberId: currentUser.id,
      date: new Date().toISOString().split("T")[0],
    });
    closePunchOutLogModal();
  };

  const isLogModalOpen = !!showLogModalFor || !!showPunchOutLogModal;
  const logModalData =
    showLogModalFor ||
    (showPunchOutLogModal
      ? { ...showPunchOutLogModal, taskId: "", projectId: "" }
      : null);
  const handleModalSave = showLogModalFor
    ? handleSaveLogFromTimer
    : handleSaveLogFromPunchOut;
  const handleModalClose = showLogModalFor
    ? closeLogModal
    : closePunchOutLogModal;

  return (
    <>
      <div
        className="flex h-[calc(var(--vh,1vh)*100)] bg-slate-100 dark:bg-slate-900"
        dir="rtl"
      >
        <Sidebar
          currentView={currentView}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <PunchClockBar />
          <ActiveTimerBar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto pb-16 lg:pb-0 h-full relative">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
          <BottomNavBar currentView={currentView} onNavigate={onNavigate} />
        </div>
      </div>

      {isLogModalOpen && currentUser && logModalData && (
        <LogFormModal
          isOpen={isLogModalOpen}
          onClose={handleModalClose}
          onSave={handleModalSave}
          log={null}
          date={new Date().toISOString().split("T")[0]}
          memberId={currentUser.id}
          initialData={logModalData}
        />
      )}
    </>
  );
};
