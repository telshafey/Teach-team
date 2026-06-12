import React from "react";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { useSettingsContext } from "@shared/contexts/SettingsContext";
import { Card } from "../ui/Card";
import { TeamMember } from "@shared/types";
import { useAuth } from "@shared/contexts/AuthContext";
import { PencilIcon } from "../ui/Icons";

interface SalariesTabProps {
  onEdit: (member: TeamMember) => void;
}

export const SalariesTab: React.FC<SalariesTabProps> = ({ onEdit }) => {
  const { teamMembers, hasPermission } = useTeamContext();
  const { currency } = useSettingsContext();

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <th className="px-4 py-2">الموظف</th>
              <th className="px-4 py-2">الراتب / سعر الساعة ({currency})</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member) => (
              <tr key={member.id} className="border-b dark:border-slate-700">
                <td className="px-4 py-2 font-medium">{member.name}</td>
                <td className="px-4 py-2">
                  {member.salary || member.hourlyRate || "N/A"}
                </td>
                <td className="px-4 py-2 text-left">
                  {hasPermission("edit_team_members") && (
                    <button
                      onClick={() => onEdit(member)}
                      className="p-2 text-slate-500 hover:text-sky-600"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
