import React from "react";
import { Task, Project } from "@shared/types";
import { Card } from "../ui/Card";
import { ClipboardDocumentListIcon, FolderIcon } from "../ui/Icons";
import { EmptyState } from "../ui/EmptyState";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@shared/contexts/SupabaseContext";
import * as api from "@shared/services/apiService";

interface UnassignedTasksCardProps {
  tasks: Task[];
  onAssign: (task: Task) => void;
}

export const UnassignedTasksCard: React.FC<UnassignedTasksCardProps> = ({
  tasks,
  onAssign,
}) => {
  const { supabaseClient } = useSupabase();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.getAll<Project>(supabaseClient!, "projects"),
    enabled: !!supabaseClient,
  });

  const projectsMap = React.useMemo(
    () =>
      projects.reduce(
        (acc, p) => ({ ...acc, [p.id]: p.name }),
        {} as Record<string, string>,
      ),
    [projects],
  );

  return (
    <Card
      title="مهام غير مسندة"
      icon={<ClipboardDocumentListIcon className="w-5 h-5" />}
    >
      <div className="flex-1 flex flex-col h-full">
        {tasks.length > 0 ? (
          <div className="space-y-3 overflow-y-auto pr-1 pb-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 rounded-md flex justify-between items-center transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {task.title}
                  </p>
                  {task.projectId && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center">
                      <FolderIcon className="w-3 h-3 ml-1" />{" "}
                      {projectsMap[task.projectId] || "مشروع غير معروف"}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onAssign(task)}
                  className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline px-2 py-1 bg-sky-50 dark:bg-sky-900/30 rounded-md"
                >
                  إسناد
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ClipboardDocumentListIcon className="w-8 h-8" />}
            title="لا توجد مهام"
            message="لا توجد مهام غير مسندة في مشاريعك حاليًا."
          />
        )}
      </div>
    </Card>
  );
};
