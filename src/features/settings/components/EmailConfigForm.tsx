import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import {
  TestTube,
  Loader2,
  Save,
  FileEdit,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { TemplateEditorModal } from "./TemplateEditorModal";
import {
  fetchEmailSettings,
  testEmailConnection,
  EmailStatusData,
} from "../services/settings.service";

interface EmailConfigFormProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const EmailConfigForm: React.FC<EmailConfigFormProps> = ({ formData, setFormData }) => {
  const { t } = useTranslation();
  const [emailStatus, setEmailStatus] = useState<EmailStatusData | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testTargetEmail, setTestTargetEmail] = useState("");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadStatus = async () => {
      try {
        setIsLoadingStatus(true);
        const res = await fetchEmailSettings();
        if (mounted && res.status === "success" && res.data) {
          setEmailStatus(res.data);
        }
      } catch (err) {
        console.warn("[SETTINGS] Gagal memuat status integrasi email:", err);
      } finally {
        if (mounted) setIsLoadingStatus(false);
      }
    };
    loadStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const handleTestEmail = async (targetEmail: string) => {
    const trimmed = targetEmail.trim();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      toast.error(t("toast.enterValidEmail"));
      return;
    }

    setIsTesting(true);
    try {
      const res = await testEmailConnection(trimmed);
      if (res.status === "success") {
        toast.success(res.message || `Email uji coba berhasil dikirim ke ${trimmed}.`);
        setIsTestModalOpen(false);
        setTestTargetEmail("");
      } else {
        toast.error(res.message || "Gagal mengirim email uji coba.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat mengirim email uji coba.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveTemplate = (subject: string, body: string) => {
    setFormData((prev: any) => ({
      ...prev,
      subjectTemplate: subject,
      bodyTemplate: body,
    }));
    try {
      localStorage.setItem(
        "lanpro_email_template_config",
        JSON.stringify({
          subjectTemplate: subject,
          bodyTemplate: body,
        })
      );
    } catch (e) {}
    setIsTemplateModalOpen(false);
    toast.success(t("toast.emailTemplateSaved"));
  };

  const handleSaveConfig = () => {
    try {
      localStorage.setItem(
        "lanpro_email_template_config",
        JSON.stringify({
          subjectTemplate: formData.subjectTemplate,
          bodyTemplate: formData.bodyTemplate,
        })
      );
      toast.success(t("toast.emailConfigSaved"));
    } catch (e) {
      toast.error(t("toast.emailConfigFailed"));
    }
  };

  const inputStyle =
    "w-full px-3 py-1.5 border border-border-subtle rounded-md text-xs font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all bg-surface text-content-strong shadow-2xs";

  return (
    <div className="space-y-4 relative">
      {/* Status Integrasi Backend Resend */}
      <div className="p-3.5 rounded-lg border border-border-subtle/80 bg-surface-sunken/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-content-strong" />
            <span className="text-xs font-semibold text-content-strong">
              {t("emailCfg.integrationStatus")}
            </span>
          </div>
          {isLoadingStatus ? (
            <div className="flex items-center gap-1 text-xs text-content-muted">
              <Loader2 size={12} className="animate-spin" />
              <span>{t("emailCfg.checking")}</span>
            </div>
          ) : emailStatus?.aktif ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
              <CheckCircle2 size={12} />
              {t("jsx.k96")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-700 border border-amber-500/30">
              <AlertTriangle size={12} />
              {t("jsx.k97")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 rounded bg-surface border border-border-subtle/60">
            <span className="text-content-muted block text-[11px]">
              {t("emailCfg.backendProvider")}
            </span>
            <span className="font-medium text-content-strong">
              {emailStatus?.provider || "Resend (REST API)"}
            </span>
          </div>
          <div className="p-2.5 rounded bg-surface border border-border-subtle/60">
            <span className="text-content-muted block text-[11px]">
              {t("emailCfg.defaultSender")}
            </span>
            {/*
              #157 — Cadangan `LanPro <lanpro@rajonet.com>` DIHAPUS. Panel ini
              melaporkan keadaan server; menampilkan alamat yang dikeraskan di
              frontend berarti berbohong ke admin persis saat `EMAIL_FROM`
              belum disetel — satu-satunya saat panel ini benar-benar dibaca.
            */}
            <span className="font-medium text-content-strong">
              {emailStatus?.from || t("emailCfg.senderNotSet")}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-content-muted leading-relaxed">
          {/*
            #157 — Kalimat lama mengklaim "dengan domain terverifikasi".
            `aktif` hanya berarti RESEND_API_KEY terisi; ia tidak tahu apa pun
            soal status DNS domain (justru itu yang gagal di #127). Klaim itu
            dicabut, dan kedua kalimat dipindah ke kamus — sebelumnya prosa
            Inggris/Indonesia keras yang tidak ikut tombol bahasa (#135).
          */}
          {emailStatus?.aktif ? t("emailCfg.statusActive") : t("emailCfg.statusMock")}
        </p>
      </div>

      {/* Template Notifikasi Assignment */}
      <div className="space-y-3 pt-1">
        <div className="space-y-1">
          <label className="text-xs font-medium text-content-body">{t("jsx.k98")}</label>
          <input
            value={formData.subjectTemplate || ""}
            onChange={(e) => setFormData({ ...formData, subjectTemplate: e.target.value })}
            placeholder={t("emailCfg.subjectPlaceholder")}
            className={inputStyle}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-content-body">
            {t("emailCfg.bodyTemplate")}
          </label>
          <textarea
            rows={4}
            value={formData.bodyTemplate || ""}
            onChange={(e) => setFormData({ ...formData, bodyTemplate: e.target.value })}
            className={`${inputStyle} resize-none font-mono text-[11px]`}
          />
        </div>
      </div>

      {/* Tombol Aksi */}
      <div className="flex flex-wrap gap-2.5 items-center mt-4 pt-3 border-t border-border-faint">
        <button
          onClick={() => setIsTemplateModalOpen(true)}
          className="flex items-center gap-1.5 border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/15 px-3 py-1.5 rounded-md text-xs font-medium transition mr-auto shadow-2xs cursor-pointer active:scale-95"
        >
          <FileEdit size={14} />
          {t("emailCfg.advancedEditor")}
        </button>

        <button
          onClick={() => setIsTestModalOpen(true)}
          disabled={isTesting}
          className="flex items-center gap-1.5 border border-border-subtle hover:bg-surface-sunken text-content-body px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50 transition cursor-pointer active:scale-95 shadow-2xs"
        >
          {isTesting ? <Loader2 size={14} className="animate-spin" /> : <TestTube size={14} />}
          Test Connection
        </button>

        <button
          onClick={handleSaveConfig}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-content-inverse px-3.5 py-1.5 rounded-md text-xs font-medium transition shadow-2xs cursor-pointer active:scale-95"
        >
          <Save size={14} />
          {t("emailCfg.saveConfig")}
        </button>
      </div>

      {/* Modal Uji Coba Kirim Email */}
      {isTestModalOpen && (
        <div className="absolute inset-0 bg-overlay/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 rounded-lg">
          <div className="bg-surface p-5 rounded-lg shadow-xl max-w-sm w-full space-y-3 border border-border-subtle">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              <h3 className="font-semibold text-sm text-content-strong">
                {t("emailCfg.testSend")}
              </h3>
            </div>
            <p className="text-xs text-content-muted">{t("jsx.j150")}</p>
            <div className="space-y-1">
              <label className="text-xs text-content-body font-medium">
                {t("emailCfg.recipient")}
              </label>
              <input
                type="email"
                value={testTargetEmail}
                onChange={(e) => setTestTargetEmail(e.target.value)}
                placeholder={t("emailCfg.recipientPlaceholder")}
                className={inputStyle}
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  setIsTestModalOpen(false);
                  setTestTargetEmail("");
                }}
                disabled={isTesting}
                className="px-3 py-1.5 rounded-md text-content-body text-xs font-medium hover:bg-surface-sunken transition-colors cursor-pointer"
              >
                {t("emailCfg.cancel")}
              </button>
              <button
                onClick={() => handleTestEmail(testTargetEmail)}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-600 text-content-inverse text-xs font-medium hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                {isTesting ? t("ui2.sending") : t("ui2.sendTest")}
              </button>
            </div>
          </div>
        </div>
      )}

      <TemplateEditorModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        mode="email"
        initialSubject={formData.subjectTemplate}
        initialBody={formData.bodyTemplate}
        onSave={handleSaveTemplate}
      />
    </div>
  );
};
