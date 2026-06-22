import React, { createContext, useContext } from "react";
import { View } from "../navigation.types";
import { useNavigate } from "react-router-dom";

interface NavigationContextType {
  onNavigate: (view: View | string, props?: any) => void;
}

export const NavigationContext = createContext<
  NavigationContextType | undefined
>(undefined);

// Provide it directly from the hook but still allow the provider to exist if needed,
// though React Router's useNavigate must be used inside RouterProvider.
export const useNavigation = (): NavigationContextType => {
  const navigate = useNavigate();

  return {
    onNavigate: (view: View | string, props?: any) => {
      // Map views to paths
      if (view === "projectDetail" && props?.projectId) {
        navigate(`/projectDetail/${props.projectId}`);
      } else if (view === "teamDetail" && props?.memberId) {
        navigate(`/team/${props.memberId}`);
      } else if (view === "meetingRoom" && props?.meeting) {
        navigate(`/meeting-room/${props.meeting.id}`, { state: { meeting: props.meeting } });
      } else if (view === "team" && props?.initialMemberId) {
        navigate(`/team/${props.initialMemberId}`);
      } else if (view === "settings" && props?.initialView) {
        navigate(`/settings`, { state: { initialView: props.initialView } });
      } else if (view === "roles" || view === "database") {
        navigate(`/settings`, { state: { initialView: view } });
      } else if (view === "myTasks") {
        navigate(`/my-tasks`);
      } else if (view === "workSummary") {
         navigate(`/work-summary`);
      } else if (view === "onboarding") {
         navigate(`/invite`); 
      } else {
        navigate(`/${view}`);
      }
    }
  };
};
