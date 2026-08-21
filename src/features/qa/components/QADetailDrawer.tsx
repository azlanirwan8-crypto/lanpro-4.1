import React from "react";
import {
  XCircle,
  FileSpreadsheet,
  History,
  RefreshCw,
  Paperclip,
  Trash2,
  Send,
  Bug,
} from "lucide-react";
import { QATestCase } from "../types";
import { StyledDropdown } from "../../../components/ui/CommonComponents";

interface QADetailDrawerProps {
  selectedTestCase: QATestCase | null;
  setSelectedTestCase: (tc: QATestCase | null) => void;
  drawerActiveTab: "details" | "history";
  setDrawerActiveTab: (tab: "details" | "history") => void;
  executionLogs: any[];
  loadingHistory: boolean;
  fetchExecutionHistory: (caseId: string) => void;
  drawerNewComment: string;
  setDrawerNewComment: (comment: string) => void;
  handleSendCommentFromDrawer: (e?: React.FormEvent) => void;
  handleEvidenceUploadFromDrawer: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveSpecificEvidenceFromDrawer: (evidenceId: string) => void;
  handleOpenCreateBugModal: (tc: QATestCase) => void;
  handleStatusChange: (
    caseId: string,
    newStatus: "Passed" | "Failed" | "Blocked" | "Retest" | "Pending"
  ) => void;
  projectMembers: any[];
}

export const QADetailDrawer: React.FC<QADetailDrawerProps> = ({
  selectedTestCase,
  setSelectedTestCase,
  drawerActiveTab,
  setDrawerActiveTab,
  executionLogs,
  loadingHistory,
  fetchExecutionHistory,
  drawerNewComment,
  setDrawerNewComment,
  handleSendCommentFromDrawer,
  handleEvidenceUploadFromDrawer,
  handleRemoveSpecificEvidenceFromDrawer,
  handleOpenCreateBugModal,
  handleStatusChange,
}) => {
  if (!selectedTestCase) return null;

  return (
    /* BACKDROP OVERLAY WITH AUTO-CLOSE ON CLICK OUTSIDE */
    <div
      className="fixed inset-0 bg-overlay/50 backdrop-blur-xs z-50 flex justify-end cursor-pointer animate-in fade-in duration-150"
      onClick={() => setSelectedTestCase(null)}
    >
      {/* INNER DRAWER CONTAINER (PREVENT CLICK PROPAGATION & COMPACT SLIM VELZON LOOK) */}
      <div
        className="w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 border-l border-border-subtle cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Velzon Offcanvas Header - COMPACT INTEGRATED HEADER & STATUS */}
        <div className="p-4 border-b border-border-faint bg-primary-surface/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-primary-surface text-content-inverse font-medium text-xs sm:text-[10px] rounded-md">
                TC #{selectedTestCase.rowNum}
              </span>
              <span
                className={`px-2 py-0.5 text-xs sm:text-[11px] sm:text-[9px] font-medium uppercase rounded-md ${
                  selectedTestCase.priority === "Critical" || selectedTestCase.priority === "High"
                    ? "bg-rose-500/10 text-danger-text border border-rose-500/30"
                    : "bg-surface-muted text-content-body border border-border-subtle/60"
                }`}
              >
                {selectedTestCase.priority || "Medium"} Priority
              </span>
            </div>

            {/* STATUS UPDATE SELECTOR INTEGRATED DIRECTLY IN TOP HEADER */}
            <div className="flex items-center gap-2 min-w-[120px]">
              <StyledDropdown
                value={selectedTestCase.status}
                onChange={(val) => {
                  handleStatusChange(selectedTestCase.id, val as any);
                  setSelectedTestCase({ ...selectedTestCase, status: val as any });
                }}
                options={[
                  { id: "Passed", label: "Passed", icon: "CheckCircle2", color: "#10B981" },
                  { id: "Failed", label: "Failed", icon: "XCircle", color: "#EF4444" },
                  { id: "Blocked", label: "Blocked", icon: "AlertOctagon", color: "#F59E0B" },
                  { id: "Retest", label: "Retest", icon: "RefreshCw", color: "#6366F1" },
                  { id: "Pending", label: "Pending", icon: "Clock", color: "#64748B" },
                ]}
                masterData={[]}
                className="w-full"
                buttonClassName={`py-1 px-2.5 rounded-md text-xs sm:text-[11px] font-medium uppercase tracking-wider border shadow-2xs ${
                  selectedTestCase.status === "Passed"
                    ? "bg-emerald-500/10 text-success-text border-emerald-500/30"
                    : selectedTestCase.status === "Failed"
                      ? "bg-rose-500/10 text-danger-text border-rose-500/30"
                      : selectedTestCase.status === "Blocked"
                        ? "bg-amber-500/10 text-warning-text border-amber-500/30"
                        : selectedTestCase.status === "Retest"
                          ? "bg-indigo-500/10 text-indigo-700 border-indigo-500/30"
                          : "bg-surface-muted text-content-secondary border-border-subtle"
                }`}
              />

              <button
                onClick={() => setSelectedTestCase(null)}
                className="p-1 rounded-md hover:bg-surface-strong/80 text-content-subtle hover:text-content-secondary transition-colors cursor-pointer"
                title="Tutup (Atau klik di luar panel)"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          <h3 className="text-sm font-medium text-content-strong line-clamp-2 leading-snug">
            {selectedTestCase.title}
          </h3>
        </div>

        {/* Velzon Compact Tab Switcher */}
        <div className="flex border-b border-border-subtle bg-surface-muted/80 p-1 gap-1">
          <button
            type="button"
            onClick={() => setDrawerActiveTab("details")}
            className={`flex-1 py-1.5 text-xs sm:text-[10px] font-medium uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              drawerActiveTab === "details"
                ? "bg-surface text-primary shadow-2xs"
                : "text-content-muted hover:text-content-strong"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Detail Case
          </button>
          <button
            type="button"
            onClick={() => {
              setDrawerActiveTab("history");
              fetchExecutionHistory(selectedTestCase.id);
            }}
            className={`flex-1 py-1.5 text-xs sm:text-[10px] font-medium uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              drawerActiveTab === "history"
                ? "bg-surface text-primary shadow-2xs"
                : "text-content-muted hover:text-content-strong"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Execution History
            {executionLogs.length > 0 && (
              <span className="bg-primary-surface/10 text-primary text-[10px] leading-none sm:text-[9px] px-1.5 py-0.2 rounded-full font-medium">
                {executionLogs.length}
              </span>
            )}
          </button>
        </div>

        {/* Sleek Body Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {drawerActiveTab === "history" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-primary" />
                    Execution History Timeline
                  </h4>
                  <p className="text-xs sm:text-[10px] text-content-subtle">
                    Audit Trail historis eksekusi pengujian
                  </p>
                </div>
                <button
                  onClick={() => fetchExecutionHistory(selectedTestCase.id)}
                  className="p-1 text-content-subtle hover:text-primary rounded-md hover:bg-surface-muted transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-6 text-center text-xs text-content-subtle flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  Memuat riwayat eksekusi...
                </div>
              ) : executionLogs.length === 0 ? (
                <div className="py-8 text-center bg-surface-sunken border border-border-faint rounded-md p-3">
                  <History className="w-6 h-6 text-content-subtle mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-content-secondary">
                    Belum Ada Catatan Run Eksekusi
                  </p>
                </div>
              ) : (
                <div className="relative pl-3.5 border-l-2 border-primary/20 space-y-3 my-2">
                  {executionLogs.map((log: any, idx: number) => {
                    const st = (log.executionStatus || log.status || "PENDING").toUpperCase();
                    return (
                      <div
                        key={log.id ? `run-log-${log.id}-${idx}` : `run-log-${idx}`}
                        className="relative group"
                      >
                        <div
                          className={`absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                            st === "PASSED"
                              ? "border-success bg-success-surface"
                              : st === "FAILED"
                                ? "border-danger bg-danger-surface"
                                : "border-slate-400 bg-slate-400"
                          }`}
                        />
                        <div className="bg-surface-sunken p-2.5 rounded-md border border-border-faint space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-content-strong">
                              {log.executedByName || "Tester"}
                            </span>
                            <span className="text-xs sm:text-[10px] text-content-subtle">
                              {new Date(
                                log.executedAt || log.timestamp || Date.now()
                              ).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-xs sm:text-[11px] sm:text-[9px] font-medium rounded ${
                              st === "PASSED"
                                ? "bg-emerald-500/15 text-success-text"
                                : st === "FAILED"
                                  ? "bg-rose-500/15 text-danger-text"
                                  : "bg-surface-strong text-content-body"
                            }`}
                          >
                            {st}
                          </span>
                          {log.evaluationNotes && (
                            <p className="text-xs text-content-secondary bg-surface p-2 rounded-md border border-border-faint">
                              {log.evaluationNotes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Steps Box */}
              <div>
                <h4 className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-wider mb-1">
                  Langkah-Langkah Pengujian (Steps)
                </h4>
                <div className="bg-surface-sunken p-3 rounded-md border border-border-subtle/60 text-xs font-medium text-content-body whitespace-pre-line leading-relaxed">
                  {selectedTestCase.steps}
                </div>
              </div>

              {/* Expected Result Box */}
              <div>
                <h4 className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-wider mb-1">
                  Hasil yang Diharapkan (Expected Result)
                </h4>
                <div className="bg-emerald-500/10 p-3 rounded-md border border-emerald-500/30 text-xs font-medium text-success-text leading-relaxed">
                  {selectedTestCase.expectedResult}
                </div>
              </div>

              {/* Evidence Screenshots */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-wider">
                    Bukti Pengujian ({selectedTestCase.evidences?.length || 0})
                  </h4>
                  <label className="px-2.5 py-1 bg-primary-surface/10 hover:bg-primary-surface/20 text-primary text-[10px] leading-none font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    <span>Upload Evidence</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleEvidenceUploadFromDrawer}
                      className="hidden"
                    />
                  </label>
                </div>

                {selectedTestCase.evidences && selectedTestCase.evidences.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTestCase.evidences.map((ev) => (
                      <div
                        key={ev.id}
                        className="relative group border border-border-subtle rounded-md overflow-hidden"
                      >
                        {ev.type === "video" ? (
                          <video src={ev.url} controls className="w-full h-24 object-cover" />
                        ) : (
                          <img src={ev.url} alt={ev.name} className="w-full h-24 object-cover" />
                        )}
                        <button
                          onClick={() => handleRemoveSpecificEvidenceFromDrawer(ev.id)}
                          className="absolute top-1 right-1 p-1 bg-danger-surface text-content-inverse rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Hapus Bukti"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-content-subtle italic">Belum ada bukti pengujian.</p>
                )}
              </div>

              {/* Comments */}
              <div>
                <h4 className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-wider mb-1.5">
                  Komentar QA ({selectedTestCase.commentsList?.length || 0})
                </h4>
                <div className="space-y-2 mb-2.5">
                  {(selectedTestCase.commentsList || []).map((cm, cIdx) => (
                    <div
                      key={cm.id || cIdx}
                      className="bg-surface-sunken p-2.5 rounded-md border border-border-subtle/60 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-content-strong">
                          {cm.userName}
                        </span>
                        <span className="text-xs sm:text-[10px] text-content-subtle">
                          {new Date(cm.timestamp).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-content-secondary">{cm.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendCommentFromDrawer} className="flex gap-2">
                  <input
                    type="text"
                    value={drawerNewComment}
                    onChange={(e) => setDrawerNewComment(e.target.value)}
                    placeholder="Tulis komentar pengujian..."
                    className="flex-1 px-3 py-2 bg-surface-sunken border border-border-subtle rounded-md text-xs font-medium outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-primary-surface hover:bg-primary-surface-hover text-content-inverse rounded-md transition-colors cursor-pointer shadow-2xs"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Failed Bug Ticket Action */}
              {selectedTestCase.status === "Failed" && (
                <div className="pt-2 border-t border-border-faint">
                  <button
                    onClick={() => handleOpenCreateBugModal(selectedTestCase)}
                    className="w-full py-2 bg-danger-surface hover:bg-danger-hover text-content-inverse font-medium rounded-md text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <Bug className="w-4 h-4" />
                    <span>Buat Tiket Bug dari Test Case Ini</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
