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
          {/* Tabs */}
          <div className="flex border-b border-border-subtle/80 px-5 bg-surface">
            <button
              onClick={() => setActiveTab("konfigurasi")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-all border-b-2 cursor-pointer ${
                activeTab === "konfigurasi"
                  ? "text-emerald-600 border-emerald-500 bg-emerald-500/10"
                  : "text-content-muted border-transparent hover:text-content-body"
              }`}
            >
              <Mail size={15} />
              {t("settings.emailConfiguration")}
            </button>
            <button
              onClick={() => setActiveTab("whatsapp")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-all border-b-2 cursor-pointer ${
                activeTab === "whatsapp"
                  ? "text-emerald-600 border-emerald-500 bg-emerald-500/10"
                  : "text-content-muted border-transparent hover:text-content-body"
              }`}
            >
              <MessageSquare size={15} />
              {t("settings.whatsappGateway")}
            </button>
            <button
              onClick={() => setActiveTab("taskBroadcast")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-all border-b-2 cursor-pointer ${
                activeTab === "taskBroadcast"
                  ? "text-emerald-600 border-emerald-500 bg-emerald-500/10"
                  : "text-content-muted border-transparent hover:text-content-body"
              }`}
            >
              <CalendarClock size={15} />
              {t("taskBroadcast.tab")}
            </button>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5">
            <div className={activeTab === "konfigurasi" ? "lg:col-span-8" : "lg:col-span-5"}>
              {activeTab === "konfigurasi" && (
                <div className="space-y-6">
                  <EmailConfigForm formData={emailConfig} setFormData={setEmailConfig} />
                  <div className="pt-6 border-t border-border-subtle/80">
                    <SystemConfigForm />
                  </div>
                </div>
              )}
              {activeTab === "whatsapp" && (
                <WhatsAppConfigForm formData={waConfig} setFormData={setWaConfig} />
              )}
              {activeTab === "taskBroadcast" && <TaskBroadcastForm />}
            </div>

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
