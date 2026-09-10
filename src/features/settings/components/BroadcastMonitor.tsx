import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useCallback } from "react";
import {
  Mail,
  MessageSquare,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  X,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchBroadcastMonitor,
  sendWhatsAppBroadcastNow,
  BroadcastMonitorItem,
} from "../services/settings.service";

interface BroadcastMonitorProps {
  channel?: "whatsapp" | "email";
  emailTemplate: { subject: string; body: string };
  waTemplate: string;
}

export const BroadcastMonitor: React.FC<BroadcastMonitorProps> = ({
  channel = "whatsapp",
  emailTemplate,
  waTemplate,
}) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<BroadcastMonitorItem[]>([]);
  const [sentCount, setSentCount] = useState<number>(0);
  const [targetCount, setTargetCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const data = await fetchBroadcastMonitor(channel);
      if (data.status === "success" && data.data) {
        setItems(data.data.items || []);
        setSentCount(data.data.totalSentToday || 0);
        setTargetCount(data.data.totalTarget || data.data.items?.length || 0);
      }
    } catch (err) {
      console.error("Gagal memuat status broadcast monitor", err);
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useEffect(() => {
    loadData();

    // Dengarkan event update broadcast saat pengguna klik "Send now"
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener("broadcast-logs-updated", handleUpdate);
    return () => {
      window.removeEventListener("broadcast-logs-updated", handleUpdate);
    };
  }, [loadData]);

  const handleManualRetry = async (id: string) => {
    setRetryingIds((prev) => new Set(prev).add(id));
    toast.info(t("toast.retrying"));

    try {
      if (channel === "whatsapp") {
        await sendWhatsAppBroadcastNow();
      }
      await loadData();
      toast.success("Berhasil diperbarui");
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengulang pengiriman");
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const replaceMockData = (template: string) => {
    let tpl = template || "";
    if (
      tpl.startsWith("[LanPro] Task Assignment\n") &&
      !tpl.startsWith("[LanPro] Task Assignment\n\n")
    ) {
      tpl = tpl.replace("[LanPro] Task Assignment\n", "[LanPro] Task Assignment\n\n");
    }
    if (tpl.includes("detail tugas melalui")) {
      tpl = tpl.replace("detail tugas melalui", "detail tugas anda melalui");
    }
    const mockTaskList =
      "```\n" +
      "[1] WHATSAPP\n" +
      "    Status           : To Do\n" +
      "    Prioritas        : Medium\n" +
      "    Tanggal Terakhir : -\n\n" +
      "[2] TES LAGI\n" +
      "    Status           : To Do\n" +
      "    Prioritas        : Medium\n" +
      "    Tanggal Terakhir : -\n" +
      "```";
    return tpl
      .replace(/\{\{user_name\}\}/g, "AZLAN IRWAN")
      .replace(/\{\{task_key\}\}/g, "PROJ-102")
      .replace(/\{\{task_title\}\}/g, "Whatsapp")
      .replace(/\{\{status\}\}/g, "To Do")
      .replace(/\{\{priority\}\}/g, "Medium")
      .replace(/\{\{task_list\}\}/g, mockTaskList)
      .replace(/\{\{app_url\}\}/g, "https://lanpro.my.id")
      .replace(/\{\{project_name\}\}/g, "LanPro Development");
  };

  const progressPercent = targetCount === 0 ? 0 : Math.round((sentCount / targetCount) * 100);

  const renderStatusBadge = (item: BroadcastMonitorItem) => {
    switch (item.status) {
      case "success":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs sm:text-[11px] font-medium bg-success/10 text-success-text">
            <CheckCircle2 size={12} className="text-emerald-500" />
            Berhasil
          </span>
        );
      case "failed": {
        const isNoPhone = Boolean(item.details?.includes("Nomor WhatsApp belum terdaftar"));
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs sm:text-[11px] font-medium bg-danger/10 text-danger-text"
            title={
              item.details ||
              (isNoPhone ? "Nomor WhatsApp belum terdaftar di profil pengguna" : "Gagal")
            }
          >
            <AlertCircle size={12} className="text-danger" />
            {isNoPhone ? "No WA Kosong" : "Gagal"}
          </span>
        );
      }
      case "skipped_no_tasks":
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs sm:text-[11px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20"
            title={item.details || "0 tugas aktif"}
          >
            <AlertCircle size={12} className="text-amber-500" />0 Tugas Aktif
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs sm:text-[11px] font-medium bg-warning/10 text-warning-text">
            <Loader2 size={12} className="animate-spin text-amber-500" />
            Pending
          </span>
        );
      case "not_sent":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs sm:text-[11px] font-medium bg-surface-muted text-content-subtle border border-border-subtle">
            <Clock size={12} className="text-content-subtle" />
            Belum Dikirim
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-medium text-content-strong">
              {t("settings.liveDailyBroadcastMonitor")}
            </h2>
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-content-muted font-medium">
                {t("broadcast.sentToday", { sukses: sentCount, total: targetCount })}
              </span>
              <span className="text-content-body font-medium">{progressPercent}%</span>
            </div>
            <div className="w-full bg-surface-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-1.5 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsPreviewOpen(true)}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary-surface/10 text-primary hover:bg-primary-surface/15 rounded-md text-xs font-medium transition border border-primary/20 shadow-xs shrink-0 w-full sm:w-auto"
        >
          <Eye size={14} />
          {t("broadcast.previewTemplate")}
        </button>
      </div>

      {/* List container scroll max 6 data */}
      <div className="max-h-[315px] overflow-y-auto pr-1.5 custom-scrollbar relative rounded-md border border-border-faint p-1.5 bg-surface-sunken/30">
        {loading && (
          <div className="absolute inset-0 bg-surface/50 backdrop-blur-xs flex items-center justify-center z-10 rounded-md">
            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
          </div>
        )}

        {items.length === 0 && !loading ? (
          <div className="py-8 text-center text-xs text-content-muted">
            Belum ada penerima broadcast yang dikonfigurasi.
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => {
              const isRetrying = retryingIds.has(item.id);
              const isWhatsApp = item.channel === "whatsapp";

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2 px-3 bg-surface border border-border-subtle rounded-md transition-all duration-200 hover:shadow-xs ${
                    isWhatsApp ? "hover:border-success" : "hover:border-info"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-full transition-colors shrink-0 ${
                        isWhatsApp ? "bg-success/10 text-success-text" : "bg-info/10 text-info-text"
                      }`}
                    >
                      {isWhatsApp ? <MessageSquare size={14} /> : <Mail size={14} />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-content-strong text-xs truncate">
                        {item.name}
                      </div>
                      <div className="text-xs sm:text-[11px] text-content-subtle font-normal truncate">
                        {item.time}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {renderStatusBadge(item)}

                    {item.status === "failed" && (
                      <button
                        onClick={() => handleManualRetry(item.id)}
                        disabled={isRetrying}
                        className="p-1 text-content-subtle hover:text-content-body hover:bg-surface-muted rounded-md transition-all disabled:opacity-50"
                        title={t("broadcast.retry")}
                      >
                        <RotateCcw
                          size={14}
                          className={isRetrying ? "animate-spin text-emerald-500" : ""}
                        />
                      </button>
                    )}
                    {item.status !== "failed" && <div className="w-6"></div> /* Alignment */}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-overlay/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-all">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] border border-border-subtle">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
              <h3 className="font-medium text-sm text-content-strong flex items-center gap-2">
                <Eye size={16} className="text-primary" />
                {t("broadcast.templatePreview")}
              </h3>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-content-subtle hover:text-content-secondary hover:bg-surface-muted p-1 rounded-md transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6 text-left">
              <div className="space-y-3">
                <div className="text-xs font-normal text-content-subtle uppercase tracking-normal flex items-center gap-2">
                  <div className="p-1 bg-blue-500/10 text-blue-500 rounded">
                    <Mail size={14} />
                  </div>
                  {t("broadcast.emailPreview")}
                </div>
                <div className="bg-surface-sunken border border-border-faint rounded-xl p-4 text-sm font-mono text-content-body whitespace-pre-wrap shadow-soft">
                  <div className="font-medium border-b border-border-subtle pb-3 mb-3 text-content-strong">
                    {t("settings.subject")}: {replaceMockData(emailTemplate.subject)}
                  </div>
                  <div className="leading-relaxed">{replaceMockData(emailTemplate.body)}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-normal text-content-subtle uppercase tracking-normal flex items-center gap-2">
                  <div className="p-1 bg-emerald-500/10 text-emerald-500 rounded">
                    <MessageSquare size={14} />
                  </div>
                  {t("broadcast.whatsappPreview")}
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm font-mono text-emerald-800 whitespace-pre-wrap leading-relaxed shadow-soft">
                  {replaceMockData(waTemplate)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
