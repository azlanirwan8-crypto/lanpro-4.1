import { useTranslation } from "react-i18next";
import React from "react";
import { Lock, Unlock, ShieldAlert, FileSpreadsheet } from "lucide-react";

interface QATopBarProps {
  lockState: {
    lockedBy: string | null;
    userName: string | null;
    lockedAt: number | null;
  };
  remainingTime: number;
  currentUserUid: string;
  currentUserRole: string;
  handleForceUnlock: () => void;
  releaseLockManually: () => void;
}

export const QATopBar: React.FC<QATopBarProps> = ({
  lockState,
  remainingTime,
  currentUserUid,
  currentUserRole,
  handleForceUnlock,
  releaseLockManually,
}) => {
  const { t } = useTranslation();
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const isLockedBySomeoneElse = lockState.lockedBy && lockState.lockedBy !== currentUserUid;

  return (
    <div className="page-title-box flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5 md:gap-3.5 bg-surface border border-border-subtle/80 p-2.5 sm:p-4 rounded-xl shadow-xs">
      {/* Velzon Header Title Section */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary-surface text-content-inverse flex items-center justify-center font-medium shadow-xs shadow-primary/20 shrink-0">
          <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-content-strong tracking-tight truncate">
            {t("qaTop.title")}
          </h1>
          <p className="hidden sm:block text-xs text-content-muted font-normal mt-0.5">
            {t("qaTop.subtitle")}
          </p>
        </div>
      </div>

      {/* Velzon Concurrency Lock Panel */}
      <div className="flex flex-wrap items-center gap-2 bg-surface-sunken/80 border border-border-subtle/60 p-2.5 px-3 rounded-lg w-full md:w-auto shrink-0">
        {lockState.lockedBy ? (
          <>
            {isLockedBySomeoneElse ? (
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="p-2 bg-danger/10 text-danger-text rounded-md">
                  <Lock className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <span className="text-xs sm:text-[10px] text-danger-text font-normal uppercase tracking-wider block">
                    {t("qaTop.lockedByOther")}
                  </span>
                  <span className="text-xs font-medium text-content-body block mt-0.5">
                    {lockState.userName}
                  </span>
                </div>
                {(currentUserRole === "admin" ||
                  currentUserRole === "head" ||
                  currentUserRole === "manager") && (
                  <button
                    onClick={handleForceUnlock}
                    className="ml-auto md:ml-2 px-2.5 py-1.5 bg-danger-surface hover:bg-danger-hover text-content-inverse text-xs sm:text-[10px] font-normal uppercase tracking-wider rounded-md transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {t("qaTop.forceUnlock")}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="p-2 bg-success/10 text-success-text rounded-md">
                  <Unlock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-[10px] text-success-text font-normal uppercase tracking-wider">
                      {t("qaTop.youHoldLock")}
                    </span>
                    <span className="px-2 py-[3px] bg-primary-surface/10 text-primary text-[10px] leading-none font-medium rounded-md">
                      {formatTime(remainingTime)}
                    </span>
                  </div>
                  <span className="text-xs sm:text-[11px] font-normal text-content-subtle block mt-0.5">
                    {t("qaTop.autoUnlock")}
                  </span>
                </div>
                <button
                  onClick={releaseLockManually}
                  className="ml-auto md:ml-2 px-2.5 py-1.5 bg-surface-muted hover:bg-surface-sunken text-content-body text-xs sm:text-[10px] font-normal uppercase tracking-wider rounded-md transition-all cursor-pointer"
                >
                  {t("qaTop.unlockNow")}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 px-1 py-0.5">
            <span className="w-2 h-2 rounded-full bg-surface-marker" />
            <span className="text-xs text-content-muted font-medium">
              {t("qaTop.noActiveLock")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
