import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Save, Loader2, Globe, Shield, Radio, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchSystemConfig,
  saveSystemConfig,
  SystemConfigData,
} from "../services/settings.service";

export const SystemConfigForm: React.FC = () => {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<SystemConfigData>({
    ssoAllowedDomains: "",
    slackWebhookUrl: "",
    allowedOrigins: "",
    appUrl: "",
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetchSystemConfig();
        if (res.status === "success" && res.data) {
          setConfig(res.data);
        }
      } catch (err) {
        console.error("Gagal memuat konfigurasi sistem:", err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await saveSystemConfig(config);
      if (res.status === "success" && res.data) {
        setConfig(res.data);
        toast.success(
          res.message ||
            t("settings.systemSaveSuccess", "Konfigurasi operasional sistem berhasil disimpan.")
        );
      } else {
        toast.error(
          res.message || t("settings.systemSaveFailed", "Gagal menyimpan konfigurasi sistem.")
        );
      }
    } catch (err: any) {
      console.error("Gagal menyimpan konfigurasi sistem:", err);
      toast.error(t("settings.systemSaveFailed", "Gagal menyimpan konfigurasi sistem."));
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle =
    "w-full px-3 py-2 bg-surface border border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-md text-xs font-normal text-content-body outline-none transition-all placeholder:text-content-subtle shadow-2xs";

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center text-content-muted gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>{t("ui.loading", "Memuat...")}</span>
      </div>
    );
  }

  return (
    /*
      #302: kartu ini SENGAJA berbentuk sama persis dengan kartu di
      `EmailConfigForm` -- `border border-border-subtle/80 bg-surface
      rounded-lg p-3.5 shadow-2xs`, judul di baris atas dengan garis pemisah.

      Sebelumnya blok ini polos tanpa kartu sementara blok email bertingkat,
      sehingga separuh halaman terlihat berlapis dan separuhnya rata. Itu yang
      dilaporkan pemilik proyek sebagai "kurang rapi".
    */
    <div className="space-y-3.5 text-left border border-border-subtle/80 bg-surface rounded-lg p-3.5 shadow-2xs">
      <div className="space-y-1 pb-2 border-b border-border-subtle/60">
        <div className="flex items-center gap-2">
          <Shield size={15} className="text-content-body" />
          <span className="text-xs font-semibold text-content-strong">
            {t("settings.operationalConfigTitle", "Pengaturan Operasional & Keamanan")}
          </span>
        </div>
        <p className="text-[11px] text-content-muted">
          {t(
            "settings.operationalConfigDesc",
            "Kelola domain yang diizinkan untuk login SSO, origin CORS, dan integrasi webhook langsung dari antarmuka tanpa perlu redeploy."
          )}
        </p>
      </div>

      <div className="space-y-4">
        {/* SSO Allowed Domains */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-content-body flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-content-subtle" />
              {t("settings.ssoAllowedDomains", "Domain Email SSO yang Diizinkan")}
            </label>
            {config.sources?.ssoAllowedDomains && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-sunken text-content-muted border border-border-subtle">
                {config.sources.ssoAllowedDomains === "database" ? "Database" : "Env Var"}
              </span>
            )}
          </div>
          <input
            type="text"
            value={config.ssoAllowedDomains}
            onChange={(e) => setConfig({ ...config, ssoAllowedDomains: e.target.value })}
            placeholder="rajonet.com, bni.co.id, gmail.com, outlook.com"
            className={inputStyle}
          />
          <p className="text-[11px] text-content-subtle">
            {t(
              "settings.ssoAllowedDomainsHelp",
              "Pisahkan beberapa domain dengan koma. Kosongkan jika ingin menggunakan nilai bawaan sistem."
            )}
          </p>
          {config.effectiveSsoDomains && config.effectiveSsoDomains.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {config.effectiveSsoDomains.map((dom) => (
                <span
                  key={dom}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-primary-surface/10 text-primary border border-primary/20"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {dom}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* CORS Allowed Origins */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-content-body flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-content-subtle" />
              {t("settings.allowedOrigins", "Origin CORS Tambahan (ALLOWED_ORIGINS)")}
            </label>
            {config.sources?.allowedOrigins && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-sunken text-content-muted border border-border-subtle">
                {config.sources.allowedOrigins === "database" ? "Database" : "Env Var"}
              </span>
            )}
          </div>
          <input
            type="text"
            value={config.allowedOrigins}
            onChange={(e) => setConfig({ ...config, allowedOrigins: e.target.value })}
            placeholder="https://lanpro.example.com, https://app.example.com"
            className={inputStyle}
          />
          <p className="text-[11px] text-content-subtle">
            {t(
              "settings.allowedOriginsHelp",
              "Origin URL yang diizinkan untuk request lintas domain dan Socket.IO. Pisahkan dengan tanda koma."
            )}
          </p>
        </div>

        {/* Slack Webhook URL */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-content-body flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-content-subtle" />
              {t("settings.slackWebhookUrl", "Slack Webhook URL (Notifikasi)")}
            </label>
            {config.sources?.slackWebhookUrl && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-sunken text-content-muted border border-border-subtle">
                {config.sources.slackWebhookUrl === "database" ? "Database" : "Env Var"}
              </span>
            )}
          </div>
          <input
            type="url"
            value={config.slackWebhookUrl}
            onChange={(e) => setConfig({ ...config, slackWebhookUrl: e.target.value })}
            placeholder="https://hooks.slack.com/services/..."
            className={inputStyle}
          />
          <p className="text-[11px] text-content-subtle">
            {t(
              "settings.slackWebhookUrlHelp",
              "URL Webhook Slack untuk menerima alert dan pemberitahuan sistem."
            )}
          </p>
        </div>

        {/*
          URL Aplikasi SENGAJA TIDAK ADA DI SINI (#302).

          Dulu blok ini memuat field "URL Aplikasi (APP_URL)", dan field itu
          TIDAK PERNAH DIBACA siapa pun. Ia menulis ke baris database
          `channel=system`, sementara satu-satunya pembacanya --
          `ambilAppUrl()` di `server/services/email.service.ts` -- membaca
          baris `channel=email`. Tiga helper lain memang membaca baris system
          (`ambilSsoAllowedDomains`, `ambilAllowedOrigins`,
          `ambilSlackWebhookUrl`), tetapi tidak ada satu pun yang membaca
          `system.appUrl`.

          Yang berlaku adalah field "URL Aplikasi" di `EmailConfigForm`.
          Jangan menambahkan field kedua di sini lagi: dua kotak berlabel sama
          di satu halaman, yang satu tanpa efek sama sekali, adalah cara
          tercepat membuat admin mengira konfigurasinya sudah benar.

          `config.appUrl` tetap ikut dikirim `handleSave()` apa adanya --
          nilai yang dimuat dibalikkan utuh, jadi tidak ada data yang hilang.
        */}
      </div>

      {/*
        #302: label tombol menyebut BAGIAN yang disimpannya, bukan "Simpan
        Konfigurasi" polos. Sebelumnya ada dua tombol berbunyi sama persis di
        satu tab -- yang satu hijau, yang satu biru -- dan tidak ada cara
        mengetahui mana menyimpan apa selain mencobanya.

        Gayanya kini identik dengan tombol simpan di `EmailConfigForm`, memakai
        token `success-surface` (bukan warna keras): satu aksi utama per kartu,
        rupa yang sama untuk peran yang sama.
      */}
      <div className="pt-3 border-t border-border-subtle/60 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-success-surface hover:bg-success-surface/90 text-content-inverse rounded-md text-xs font-medium transition shadow-2xs disabled:opacity-50 cursor-pointer active:scale-95"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{t("settings.saveOperationalConfiguration", "Simpan Pengaturan Operasional")}</span>
        </button>
      </div>
    </div>
  );
};
