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

  return {
    canEditPlanning,
  };
};
