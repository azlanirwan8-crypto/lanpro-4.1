import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Mail, MessageSquare, CalendarClock } from "lucide-react";
import { EmailConfigForm } from "./components/EmailConfigForm";
import { WhatsAppConfigForm } from "./components/WhatsAppConfigForm";
import { BroadcastMonitor } from "./components/BroadcastMonitor";
import { SystemConfigForm } from "./components/SystemConfigForm";
import { TaskBroadcastForm } from "./components/TaskBroadcastForm";
import { PageHeader } from "../../components/ui/PageHeader";
import { Tabs } from "../../components/ui/Tabs";

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
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden bg-surface-muted text-left">
      {/* #424 — panel putih page-title nempel header */}
      <PageHeader
        className="shrink-0"
        breadcrumbs={[
          { label: t("nav.settings", "Settings") },
          { label: t("settings.systemIntegrationConfiguration"), current: true },
        ]}
        title={t("settings.systemIntegrationConfiguration")}
      />

      <div className="flex-1 flex flex-col min-h-0 px-3 md:px-5 pt-3 md:pt-4 pb-3 md:pb-5">
        <div className="flex-1 flex flex-col min-h-0 bg-surface border border-border-subtle/80 rounded-lg shadow-2xs overflow-hidden">
          <div className="flex-1 overflow-auto flex flex-col">
            {/* Tabs — #368 scroll HP + #432 komponen bersama */}
            <Tabs
              value={activeTab}
              onChange={setActiveTab}
              tone="success"
              showActiveSurface
              className="px-3 sm:px-5 bg-surface"
              tabs={[
                {
                  id: "konfigurasi",
                  label: t("settings.emailConfiguration"),
                  shortLabel: t("settings.emailShort", "Email"),
                  icon: <Mail size={15} className="shrink-0" />,
                },
                {
                  id: "whatsapp",
                  label: t("settings.whatsappGateway"),
                  shortLabel: t("settings.whatsappShort", "WA"),
                  icon: <MessageSquare size={15} className="shrink-0" />,
                },
                {
                  id: "taskBroadcast",
                  label: t("taskBroadcast.tab"),
                  shortLabel: t("taskBroadcast.tabShort", "Broadcast"),
                  icon: <CalendarClock size={15} className="shrink-0" />,
                },
              ]}
            />

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
    </div>
  );
};
