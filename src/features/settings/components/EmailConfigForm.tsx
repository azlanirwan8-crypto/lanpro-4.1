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
  Server,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { TemplateEditorModal } from "./TemplateEditorModal";
import {
  fetchEmailSettings,
  fetchEmailConfig,
  saveEmailConfig,
  testEmailConnection,
  EmailStatusData,
  EmailConfigData,
} from "../services/settings.service";

interface EmailConfigFormProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const EmailConfigForm: React.FC<EmailConfigFormProps> = ({ formData, setFormData }) => {
  const { t } = useTranslation();
  const [emailStatus, setEmailStatus] = useState<EmailStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testTargetEmail, setTestTargetEmail] = useState("");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [provider, setProvider] = useState<"smtp" | "resend">("smtp");
  const [smtpHost, setSmtpHost] = useState("mail.lanpro.my.id");
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpUser, setSmtpUser] = useState("admin@lanpro.my.id");
  const [smtpPass, setSmtpPass] = useState("");
  const [hasSmtpPass, setHasSmtpPass] = useState(false);
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [senderName, setSenderName] = useState("LanPro System");
  const [senderEmail, setSenderEmail] = useState("admin@lanpro.my.id");
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  // Item #278: URL aplikasi, dipakai untuk tautan di dalam email.
  const [appUrl, setAppUrl] = useState("");

  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        const [statusRes, configRes] = await Promise.all([
          fetchEmailSettings().catch(() => null),
          fetchEmailConfig().catch(() => null),
        ]);

        if (!mounted) return;

        if (statusRes?.status === "success" && statusRes.data) {
          setEmailStatus(statusRes.data);
        }

        if (configRes?.status === "success" && configRes.data) {
          const d: EmailConfigData = configRes.data;
          setProvider(d.provider || "smtp");
          setSmtpHost(d.smtpHost || "mail.lanpro.my.id");
          setSmtpPort(d.smtpPort || 465);
          setSmtpUser(d.smtpUser || "admin@lanpro.my.id");
          setHasSmtpPass(Boolean(d.hasSmtpPass));
          setSmtpSecure(d.smtpSecure !== false);
          setSenderName(d.senderName || "LanPro System");
          setSenderEmail(d.senderEmail || "admin@lanpro.my.id");
          setHasApiKey(Boolean(d.hasApiKey));
          setAppUrl(d.appUrl || "");

          if (d.subjectTemplate) {
            setFormData((prev: any) => ({ ...prev, subjectTemplate: d.subjectTemplate }));
          }
          if (d.bodyTemplate) {
            setFormData((prev: any) => ({ ...prev, bodyTemplate: d.bodyTemplate }));
          }
        }
      } catch (err) {
        console.warn("[SETTINGS] Gagal memuat konfigurasi email:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadConfig();
    return () => {
      mounted = false;
    };
  }, [setFormData]);

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
        // Muat ulang status
        const statusRes = await fetchEmailSettings();
        if (statusRes.status === "success" && statusRes.data) {
          setEmailStatus(statusRes.data);
        }
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
    setIsTemplateModalOpen(false);
    toast.success(t("toast.emailTemplateSaved"));
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const payload: Partial<EmailConfigData> = {
        provider,
        smtpHost: smtpHost.trim(),
        smtpPort: Number(smtpPort),
        smtpUser: smtpUser.trim(),
        smtpPass: smtpPass.trim() ? smtpPass : undefined,
        smtpSecure,
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim(),
        apiKey: apiKey.trim() ? apiKey : undefined,
        subjectTemplate: formData.subjectTemplate,
        bodyTemplate: formData.bodyTemplate,
        appUrl: appUrl.trim(),
      };

      const res = await saveEmailConfig(payload);
      if (res.status === "success") {
        toast.success("Konfigurasi email berhasil disimpan ke database.");
        if (res.data) {
          setHasSmtpPass(Boolean(res.data.hasSmtpPass));
          setHasApiKey(Boolean(res.data.hasApiKey));
          setSmtpPass("");
          setApiKey("");
        }
        // Muat ulang status
        const statusRes = await fetchEmailSettings();
        if (statusRes?.status === "success" && statusRes.data) {
          setEmailStatus(statusRes.data);
        }
      } else {
        toast.error(res.message || "Gagal menyimpan konfigurasi email.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan konfigurasi email.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle =
    "w-full px-3 py-1.5 border border-border-subtle rounded-md text-xs font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all bg-surface text-content-strong shadow-2xs";

  return (
    <div className="space-y-4 relative">
      {/* Status Integrasi Email */}
      <div className="p-3.5 rounded-lg border border-border-subtle/80 bg-surface-sunken/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-content-strong" />
            <span className="text-xs font-semibold text-content-strong">
              {t("emailCfg.integrationStatus")}
            </span>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-1 text-xs text-content-muted">
              <Loader2 size={12} className="animate-spin" />
              <span>{t("emailCfg.checking")}</span>
            </div>
          ) : emailStatus?.aktif ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
              <CheckCircle2 size={12} />
              Aktif: {emailStatus.provider}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-700 border border-amber-500/30">
              <AlertTriangle size={12} />
              {t("emailCfg.simulationModeDev")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 rounded bg-surface border border-border-subtle/60">
            <span className="text-content-muted block text-[11px]">
              {t("emailCfg.backendProvider")}
            </span>
            <span className="font-medium text-content-strong">
              {emailStatus?.provider || (provider === "smtp" ? "SMTP Server" : "Resend REST API")}
            </span>
          </div>
          <div className="p-2.5 rounded bg-surface border border-border-subtle/60">
            <span className="text-content-muted block text-[11px]">
              {t("emailCfg.defaultSender")}
            </span>
            <span className="font-medium text-content-strong">
              {emailStatus?.from || senderEmail || "admin@lanpro.my.id"}
            </span>
          </div>
        </div>
      </div>

      {/* Form Konfigurasi Koneksi Email (Item #264) */}
      <div className="space-y-3.5 pt-1 border border-border-subtle/80 bg-surface rounded-lg p-3.5 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle/60">
          <div className="flex items-center gap-2">
            <Server size={15} className="text-content-body" />
            <span className="text-xs font-semibold text-content-strong">
              Pengaturan Koneksi Mail Server
            </span>
          </div>
          {/* Pemilihan Provider */}
          <div className="flex rounded-md p-0.5 bg-surface-sunken border border-border-subtle">
            <button
              type="button"
              onClick={() => setProvider("smtp")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all cursor-pointer ${
                provider === "smtp"
                  ? "bg-surface text-emerald-700 shadow-2xs font-semibold"
                  : "text-content-muted hover:text-content-body"
              }`}
            >
              SMTP Domain
            </button>
            <button
              type="button"
              onClick={() => setProvider("resend")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all cursor-pointer ${
                provider === "resend"
                  ? "bg-surface text-emerald-700 shadow-2xs font-semibold"
                  : "text-content-muted hover:text-content-body"
              }`}
            >
              Resend API
            </button>
          </div>
        </div>

        {provider === "smtp" ? (
          /* Bidang SMTP Server */
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium text-content-body">SMTP Host Server</label>
                <input
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="mail.lanpro.my.id"
                  className={inputStyle}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-content-body">Port</label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  placeholder="465"
                  className={inputStyle}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-content-body">
                  Email / Username SMTP
                </label>
                <input
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="admin@lanpro.my.id"
                  className={inputStyle}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-content-body">
                    Password Akun Email
                  </label>
                  {hasSmtpPass && !smtpPass && (
                    <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                      <Lock size={10} /> Tersimpan di DB
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder={
                      hasSmtpPass ? "•••••••••••• (Ketik untuk ganti)" : "Masukkan password mailbox"
                    }
                    className={`${inputStyle} pr-8`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-body cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-content-body">
                  Nama Tampilan Pengirim
                </label>
                <input
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="LanPro System"
                  className={inputStyle}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-content-body">
                  Alamat Email Pengirim (From)
                </label>
                <input
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="admin@lanpro.my.id"
                  className={inputStyle}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="smtpSecureCheckbox"
                checked={smtpSecure}
                onChange={(e) => setSmtpSecure(e.target.checked)}
                className="rounded border-border-subtle text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label
                htmlFor="smtpSecureCheckbox"
                className="text-xs text-content-body cursor-pointer"
              >
                Gunakan Koneksi Aman SSL / TLS (Disarankan untuk port 465)
              </label>
            </div>
          </div>
        ) : (
          /* Bidang Resend REST API */
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-content-body">Resend API Key</label>
                {hasApiKey && !apiKey && (
                  <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                    <Lock size={10} /> Tersimpan di DB
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasApiKey ? "•••••••••••• (Ketik untuk ganti)" : "re_123456789..."}
                  className={`${inputStyle} pr-8`}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-body cursor-pointer"
                >
                  {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-content-body">
                Alamat Email Pengirim (From)
              </label>
              <input
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="LanPro <noreply@domain-anda.com>"
                className={inputStyle}
              />
            </div>
          </div>
        )}
      </div>

      {/* URL Aplikasi (Item #278) — di luar cabang provider, sebab tautan di
          dalam email dipakai oleh jalur SMTP maupun Resend. */}
      <div className="space-y-1 pt-1">
        <label className="text-xs font-medium text-content-body">URL Aplikasi</label>
        <input
          value={appUrl}
          onChange={(e) => setAppUrl(e.target.value)}
          placeholder="https://lanpro.my.id"
          className={inputStyle}
        />
        <p className="text-xs sm:text-[11px] text-content-muted">
          Dipakai untuk tautan di dalam email (tombol "Buka LanPro", tautan reset kata sandi). Ganti
          di sini bila domain berpindah — tidak perlu mengubah berkas di server. Kosongkan untuk
          memakai nilai bawaan dari lingkungan server.
        </p>
      </div>

      {/*
        Subjek dan templat email PINDAH ke tab Broadcast Task (#299).

        Tab ini menyimpan kredensial dan koneksi; templat menentukan isi
        kiriman, dan isi kiriman hidup di tempat jadwal serta penerimanya
        diatur. Nilainya tetap disimpan lewat berkas ini (`handleSaveConfig`
        masih mengirim keduanya), sehingga sumber datanya tidak terpecah --
        yang berpindah hanya tempat mengubahnya.
      */}

      {/* Tombol Aksi */}
      <div className="flex flex-wrap gap-2.5 items-center mt-4 pt-3 border-t border-border-faint">
        <button
          type="button"
          onClick={() => setIsTemplateModalOpen(true)}
          className="flex items-center gap-1.5 border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/15 px-3 py-1.5 rounded-md text-xs font-medium transition mr-auto shadow-2xs cursor-pointer active:scale-95"
        >
          <FileEdit size={14} />
          {t("emailCfg.advancedEditor")}
        </button>

        <button
          type="button"
          onClick={() => setIsTestModalOpen(true)}
          disabled={isTesting || isSaving}
          className="flex items-center gap-1.5 border border-border-subtle hover:bg-surface-sunken text-content-body px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50 transition cursor-pointer active:scale-95 shadow-2xs"
        >
          {isTesting ? <Loader2 size={14} className="animate-spin" /> : <TestTube size={14} />}
          Uji Coba Kirim Email
        </button>

        <button
          type="button"
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-content-inverse px-3.5 py-1.5 rounded-md text-xs font-medium transition shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Simpan Konfigurasi
        </button>
      </div>

      {/* Modal Uji Coba Kirim Email */}
      {isTestModalOpen && (
        <div className="absolute inset-0 bg-overlay/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 rounded-lg">
          <div className="bg-surface p-5 rounded-lg shadow-xl max-w-sm w-full space-y-3 border border-border-subtle">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              <h3 className="font-semibold text-sm text-content-strong">
                Uji Coba Pengiriman Email
              </h3>
            </div>
            <p className="text-xs text-content-muted leading-relaxed">
              Sistem akan mengirim email uji coba menggunakan konfigurasi yang tersimpan di basis
              data.
            </p>
            <div className="space-y-1">
              <label className="text-xs text-content-body font-medium">
                Email Penerima Uji Coba
              </label>
              <input
                type="email"
                value={testTargetEmail}
                onChange={(e) => setTestTargetEmail(e.target.value)}
                placeholder="masukkan-email-anda@gmail.com"
                className={inputStyle}
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
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
                type="button"
                onClick={() => handleTestEmail(testTargetEmail)}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-600 text-content-inverse text-xs font-medium hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                {isTesting ? t("common.sending") : t("emailCfg.sendTest")}
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
