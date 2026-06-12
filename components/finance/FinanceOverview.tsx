import React, { useMemo } from "react";
import { useTeamContext } from "@shared/contexts/TeamContext";
import { useTimeLogContext } from "@shared/contexts/TimeLogContext";
import { useRequestsContext } from "@shared/contexts/RequestsContext";
import { useSettingsContext } from "@shared/contexts/SettingsContext";
import { Card } from "../ui/Card";
import { BarChart } from "../ui/Charts";
import { calculateProjectCostBreakdown } from "@shared/utils/costs";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@shared/contexts/SupabaseContext";
import * as api from "@shared/services/apiService";
import { Project } from "@shared/types";

export const FinanceOverview: React.FC = () => {
  const { teamMembers } = useTeamContext();
  const { dailyLogs } = useTimeLogContext();
  const { expenseClaims, overtimeRequests } = useRequestsContext();
  const { currency, siteSettings } = useSettingsContext();
  const { supabaseClient } = useSupabase();

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => api.getAll(supabaseClient!, "projects"),
    enabled: !!supabaseClient,
  });

  const totalSalaries = useMemo(() => {
    return teamMembers
      .filter((m) => m.salary)
      .reduce((sum, m) => sum + (m.salary || 0), 0);
  }, [teamMembers]);

  const totalApprovedExpenses = useMemo(() => {
    return expenseClaims
      .filter((e) => e.status === "approved")
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenseClaims]);

  const projectCosts = useMemo(() => {
    return projects.map((project) => {
      const { totalCost } = calculateProjectCostBreakdown(
        project,
        teamMembers,
        dailyLogs,
        expenseClaims,
        overtimeRequests,
        siteSettings,
      );
      return { label: project.name, value: totalCost };
    });
  }, [
    projects,
    dailyLogs,
    teamMembers,
    expenseClaims,
    overtimeRequests,
    siteSettings,
  ]);

  const top5CostlyProjects = useMemo(() => {
    return projectCosts.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [projectCosts]);

  const totalProjectCosts = projectCosts.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="إجمالي الرواتب الشهرية">
          <p className="text-2xl font-bold">
            {totalSalaries.toLocaleString()}{" "}
            <span className="text-sm">{currency}</span>
          </p>
        </Card>
        <Card title="إجمالي المصروفات المعتمدة">
          <p className="text-2xl font-bold">
            {totalApprovedExpenses.toLocaleString()}{" "}
            <span className="text-sm">{currency}</span>
          </p>
        </Card>
        <Card title="إجمالي تكاليف المشاريع">
          <p className="text-2xl font-bold">
            {totalProjectCosts.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}{" "}
            <span className="text-sm">{currency}</span>
          </p>
        </Card>
      </div>
      <Card title="أكثر المشاريع تكلفة">
        <BarChart title="" data={top5CostlyProjects} />
      </Card>
    </div>
  );
};
