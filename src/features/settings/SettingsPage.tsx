import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Mail, MessageSquare, CalendarClock } from "lucide-react";
import { EmailConfigForm } from "./components/EmailConfigForm";
import { WhatsAppConfigForm } from "./components/WhatsAppConfigForm";
import { BroadcastMonitor } from "./components/BroadcastMonitor";
import { SystemConfigForm } from "./components/SystemConfigForm";
import { TaskBroadcastForm } from "./components/TaskBroadcastForm";

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  /**
   * Tiga tab, bukan empat (#299).
   *
   * Tab "Sistem & Keamanan" dilebur ke "Konfigurasi" atas permintaan pemilik
   * proyek: keduanya sama-sama pengaturan koneksi dan kredensial, dan
   * memisahkannya membuat admin harus menebak yang mana isinya di mana.
   *
   * Subjek dan templat email pindah dari sini ke tab Broadcast Task, sebab
   * di sanalah ia benar-benar dipakai -- lihat langkah 1 di #299 yang
   * menyambungkannya ke `kirimEmailTaskDigest()`.
   */
  const [activeTab, setActiveTab] = useState<"konfigurasi" | "whatsapp" | "taskBroadcast">(
    "konfigurasi"
  );

  const [emailConfig, setEmailConfig] = useState({
    host: "",
    port: "",
    username: "",
    password: "",
    encryption: "SSL",
    senderName: "",
    subjectTemplate: "[LanPro] Task Assignment: {{task_key}}",
    bodyTemplate:
      "Hi {{user_name}},\n\nYou have been assigned to task {{task_key}}: {{task_title}}.\nStatus: {{status}}\nProject: {{project_name}}\n\nPlease check the dashboard for details.",
  });

  const [waConfig, setWaConfig] = useState({
    provider: "Local",
    endpoint: "",
    token: "",
    deviceId: "",
    senderNumber: "",
    messageTemplate: "Halo {{user_name}},",
    scheduleDays: ["1", "2", "3", "4", "5", "6", "7"],
    scheduleTime: "07:00",
    recipientIds: [] as string[],
  });

  return (
    <div className="w-full flex-1 flex flex-col p-3 md:p-5 min-h-0 overflow-hidden bg-surface-sunken/60 text-left">
      <div className="flex-1 flex flex-col min-h-0 bg-surface border border-border-subtle/80 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border-subtle/80 bg-surface-sunken/80 shrink-0 flex items-center justify-between">
          <h1 className="text-xs font-normal text-content-strong uppercase tracking-wide">
            {t("settings.systemIntegrationConfiguration")}
          </h1>
        </div>

        <div className="flex-1 overflow-auto flex flex-col">
          {/* Tabs — #368: scroll horizontal di HP */}
          <div className="flex border-b border-border-subtle/80 px-3 sm:px-5 bg-surface overflow-x-auto custom-scrollbar shrink-0">
            <button
              onClick={() => setActiveTab("konfigurasi")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-xs font-medium transition-all border-b-2 cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === "konfigurasi"
                  ? "text-emerald-600 border-emerald-500 bg-emerald-500/10"
                  : "text-content-muted border-transparent hover:text-content-body"
              }`}
            >
              <Mail size={15} className="shrink-0" />
              <span className="hidden sm:inline">{t("settings.emailConfiguration")}</span>
              <span className="sm:hidden">{t("settings.emailShort", "Email")}</span>
            </button>
            <button
              onClick={() => setActiveTab("whatsapp")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-xs font-medium transition-all border-b-2 cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === "whatsapp"
                  ? "text-emerald-600 border-emerald-500 bg-emerald-500/10"
                  : "text-content-muted border-transparent hover:text-content-body"
              }`}
            >
              <MessageSquare size={15} className="shrink-0" />
              <span className="hidden sm:inline">{t("settings.whatsappGateway")}</span>
              <span className="sm:hidden">WhatsApp</span>
            </button>
            <button
              onClick={() => setActiveTab("taskBroadcast")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-xs font-medium transition-all border-b-2 cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === "taskBroadcast"
                  ? "text-emerald-600 border-emerald-500 bg-emerald-500/10"
                  : "text-content-muted border-transparent hover:text-content-body"
              }`}
            >
              <CalendarClock size={15} className="shrink-0" />
              <span className="hidden sm:inline">{t("taskBroadcast.tab")}</span>
              <span className="sm:hidden">{t("taskBroadcast.tabShort", "Broadcast")}</span>
            </button>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 items-start">
            {activeTab === "konfigurasi" ? (
              /*
                #303: tab Konfigurasi dibagi dua kolom atas permintaan pemilik
                proyek -- Pengaturan Operasional di KIRI, blok Email di KANAN.

                Sebelumnya keduanya bertumpuk di satu kolom `lg:col-span-8`,
                jadi separuh kanan halaman kosong melompong dan pengaturan
                operasional terdorong jauh ke bawah lipatan.

                `order` DIPAKAI SENGAJA, bukan urutan DOM: di layar sempit
                grid runtuh jadi satu kolom dan yang tampil lebih dulu adalah
                yang duluan di DOM. Tab ini bernama "Konfigurasi Email", jadi
                blok Email harus yang pertama terbaca di ponsel -- sementara di
                desktop `lg:order-2` memindahkannya ke kanan sesuai permintaan.
                Menukar urutan DOM-nya akan memenuhi permintaan desktop dengan
                mengorbankan ponsel.

                `items-start` supaya kedua kolom rata atas dan kolom yang lebih
                pendek tidak ikut meregang mengikuti tetangganya.
              */
              <>
                <div className="lg:col-span-7 lg:order-2">
                  <EmailConfigForm formData={emailConfig} setFormData={setEmailConfig} />
                </div>
                <div className="lg:col-span-5 lg:order-1">
                  <SystemConfigForm />
                </div>
              </>
            ) : (
              <div className="lg:col-span-5">
                {activeTab === "whatsapp" && (
                  <WhatsAppConfigForm formData={waConfig} setFormData={setWaConfig} />
                )}
                {activeTab === "taskBroadcast" && <TaskBroadcastForm />}
              </div>
            )}

            {/*
              Monitoring pengiriman menemani tab yang BENAR-BENAR mengirim
              (#299): WhatsApp dan Broadcast Task. Tab Konfigurasi tidak
              mengirim apa pun -- ia hanya menyimpan kredensial -- jadi
              menempelkan monitor di sana hanya mengisi ruang.
            */}
            {activeTab !== "konfigurasi" && (
              <div className="lg:col-span-7 border-l border-border-subtle/80 pl-5">
                <BroadcastMonitor
                  emailTemplate={{
                    subject: emailConfig.subjectTemplate,
                    body: emailConfig.bodyTemplate,
                  }}
                  waTemplate={waConfig.messageTemplate}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
