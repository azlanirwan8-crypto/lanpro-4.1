import { AppRole, PeranEfektif } from "../../types";
import { hasPermission } from "../../lib/permissions";
import { PlanningViewProps } from "./types";

export const usePlanning = (props: PlanningViewProps) => {
  const { userRole, currentUserProfile } = props;

  const canEditPlanning = hasPermission(
    userRole as PeranEfektif,
    "planning",
    "update",
    false,
    currentUserProfile?.permissions
  );

  const priorityColorMap: Record<string, string> = {
    High: "text-red-500 bg-red-500/10 border-red-100",
    Highest: "text-red-700 bg-red-500/15 border-red-200",
    Medium: "text-amber-500 bg-amber-500/10 border-amber-100",
    Low: "text-blue-500 bg-blue-500/10 border-blue-100",
    Lowest: "text-content-muted bg-surface-muted border-border-subtle",
  };

  return {
    canEditPlanning,
    priorityColorMap,
  };
};
