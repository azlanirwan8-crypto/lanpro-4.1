import React from "react";
import { CheckCircle2, Activity, AlertCircle, Zap, Users } from "lucide-react";

interface KpiMetricsRowProps {
  completionPercentage: number;
  inProgressTasks: any[];
  overdueTasks: any[];
  weeklyVelocity: number;
  projectMembers: any[];
}

export const KpiMetricsRow: React.FC<KpiMetricsRowProps> = ({
  completionPercentage,
  inProgressTasks,
  overdueTasks,
  weeklyVelocity,
  projectMembers,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full h-full select-none">
      {/* Card 1: Total Completion */}
      <div className="bg-surface p-5 rounded-xl border border-border-subtle/60 hover:shadow-md transition-all relative overflow-hidden flex flex-col h-full shadow-soft group">
        <div className="w-10 h-10 rounded-xl bg-primary-surface/10 text-primary flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <span className="text-xs sm:text-[10px] font-medium uppercase tracking-widest text-content-subtle mb-1">
          TOTAL COMPLETION
        </span>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-3xl font-medium text-content-strong">{completionPercentage}%</span>
          <span className="text-xs font-medium text-content-subtle">Stable</span>
        </div>
      </div>

      {/* Card 2: In Progress */}
      <div className="bg-surface p-5 rounded-xl border border-border-subtle/60 hover:shadow-md transition-all relative overflow-hidden flex flex-col h-full shadow-soft group">
        <div className="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <span className="text-xs sm:text-[10px] font-medium uppercase tracking-widest text-content-subtle mb-1">
          IN PROGRESS
        </span>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-3xl font-medium text-content-strong">{inProgressTasks.length}</span>
          <span className="text-xs font-medium text-content-subtle">Issues</span>
        </div>
      </div>

      {/* Card 3: Overdue Alerts */}
      <div className="bg-surface p-5 rounded-xl border border-border-subtle/60 hover:shadow-md transition-all relative overflow-hidden flex flex-col h-full shadow-soft group">
        <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
          <AlertCircle className="w-5 h-5" />
        </div>
        <span className="text-xs sm:text-[10px] font-medium uppercase tracking-widest text-content-subtle mb-1">
          OVERDUE ALERTS
        </span>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-3xl font-medium text-danger">{overdueTasks.length}</span>
          <span className="text-xs font-medium text-danger">Stoppers</span>
        </div>
      </div>

      {/* Card 4: Weekly Velocity */}
      <div className="bg-surface p-5 rounded-xl border border-border-subtle/60 hover:shadow-md transition-all relative overflow-hidden flex flex-col h-full shadow-soft group">
        <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
          <Zap className="w-5 h-5 text-warning" />
        </div>
        <span className="text-xs sm:text-[10px] font-medium uppercase tracking-widest text-content-subtle mb-1">
          WEEKLY VELOCITY
        </span>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-3xl font-medium text-content-strong">
            {weeklyVelocity ? weeklyVelocity : "0.0"}
          </span>
          <span className="text-xs font-medium text-content-subtle">pts/spr</span>
        </div>
      </div>

      {/* Card 5: Team Size */}
      <div className="bg-surface p-5 rounded-xl border border-border-subtle/60 hover:shadow-md transition-all relative overflow-hidden flex flex-col h-full shadow-soft group">
        <div className="w-10 h-10 rounded-xl bg-surface-muted text-content-muted flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
          <Users className="w-5 h-5" />
        </div>
        <span className="text-xs sm:text-[10px] font-medium uppercase tracking-widest text-content-subtle mb-1">
          MEMBERS REGISTERED
        </span>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-3xl font-medium text-content-strong">{projectMembers.length}</span>
          <span className="text-xs font-medium text-content-subtle">Users</span>
        </div>
      </div>
    </div>
  );
};
