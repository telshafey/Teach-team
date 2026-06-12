import React from "react";
import { Task } from "@shared/types";
import { Card } from "../ui/Card";

interface MemberOpenTasksCardProps {
  tasks: Task[];
}

export const MemberOpenTasksCard: React.FC<MemberOpenTasksCardProps> = ({
  tasks,
}) => {
  return (
    <Card title="المهام المفتوحة">
      <div className="space-y-2">
        {tasks.slice(0, 5).map((task) => (
          <div
            key={task.id}
            className="p-2 bg-slate-100 dark:bg-slate-700 rounded-md text-sm"
          >
            {task.title}
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-sm text-center text-slate-500 py-4">
            لا توجد مهام مفتوحة.
          </p>
        )}
      </div>
    </Card>
  );
};
