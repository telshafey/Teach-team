import React, { useState, useMemo } from "react";
import { useSupportContext } from "@shared/contexts/SupportContext";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { useAuth } from "@shared/contexts/AuthContext";
import { SupportTicket, TicketStatus, TicketPriority } from "@shared/types";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { PlusIcon, TicketIcon } from "../ui/Icons";
import { SupportTicketFormModal } from "../modals/SupportTicketFormModal";
import { SupportTicketDetailModal } from "../modals/SupportTicketDetailModal";
import { StatusBadge } from "../ui/StatusBadge";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";

export const SupportPage: React.FC = () => {
  const { tickets, isLoading } = useSupportContext();
  const { teamMembers, hasPermission } = useTeamContext();
  const { currentUser } = useAuth();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null,
  );

  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TicketPriority>(
    "all",
  );

  const canManage = hasPermission("manage_support_tickets");
  const membersMap = useMemo(
    () =>
      teamMembers.reduce(
        (acc, m) => ({ ...acc, [m.id]: m.name }),
        {} as Record<number, string>,
      ),
    [teamMembers],
  );

  const filteredTickets = useMemo(() => {
    let displayTickets = canManage
      ? tickets
      : tickets.filter((t) => t.creatorId === currentUser?.id);

    if (statusFilter !== "all") {
      displayTickets = displayTickets.filter((t) => t.status === statusFilter);
    }
    if (priorityFilter !== "all") {
      displayTickets = displayTickets.filter(
        (t) => t.priority === priorityFilter,
      );
    }

    return displayTickets;
  }, [tickets, currentUser, canManage, statusFilter, priorityFilter]);

  return (
    <>
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              الدعم الفني
            </h2>
            <p className="text-md text-slate-500 dark:text-slate-400">
              تتبع طلبات الدعم الخاصة بك أو قم بإدارة طلبات المستخدمين.
            </p>
          </div>
          <button
            onClick={() => setIsFormModalOpen(true)}
            className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 w-full md:w-auto"
          >
            <PlusIcon className="w-5 h-5" />
            <span>فتح تذكرة جديدة</span>
          </button>
        </div>

        <Card>
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="text-sm font-medium">الحالة:</span>
              {(["all", "open", "in-progress", "closed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-xs rounded-full ${statusFilter === s ? "bg-sky-600 text-white" : "bg-slate-200 dark:bg-slate-700"}`}
                >
                  {s === "all" ? "الكل" : s}
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="text-sm font-medium">الأولوية:</span>
              {(["all", "low", "medium", "high", "urgent"] as const).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(p)}
                    className={`px-3 py-1 text-xs rounded-full ${priorityFilter === p ? "bg-sky-600 text-white" : "bg-slate-200 dark:bg-slate-700"}`}
                  >
                    {p === "all" ? "الكل" : p}
                  </button>
                ),
              )}
            </div>
          </div>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <LoadingSpinner />
            </div>
          ) : filteredTickets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3">الموضوع</th>
                    {canManage && <th className="px-6 py-3">مقدم الطلب</th>}
                    <th className="px-6 py-3">الحالة</th>
                    <th className="px-6 py-3">الأولوية</th>
                    <th className="px-6 py-3">آخر تحديث</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                    >
                      <td className="px-6 py-4 font-medium">
                        {ticket.subject}
                      </td>
                      {canManage && (
                        <td className="px-6 py-4">
                          {membersMap[ticket.creatorId] || "غير معروف"}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <StatusBadge
                          status={ticket.status}
                          type="support_ticket_status"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          status={ticket.priority}
                          type="support_ticket_priority"
                        />
                      </td>
                      <td className="px-6 py-4">
                        {format(parseISO(ticket.updatedAt), "d MMM yyyy, p", {
                          locale: arSA,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<TicketIcon className="w-12 h-12" />}
              title="لا توجد تذاكر"
              message="لم يتم العثور على تذاكر دعم تطابق معايير التصفية."
            />
          )}
        </Card>
      </div>

      <SupportTicketFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
      />

      {selectedTicket && (
        <SupportTicketDetailModal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          ticket={selectedTicket}
        />
      )}
    </>
  );
};
