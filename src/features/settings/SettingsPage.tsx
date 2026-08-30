import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Mail, MessageSquare, Shield } from "lucide-react";
import { EmailConfigForm } from "./components/EmailConfigForm";
import { WhatsAppConfigForm } from "./components/WhatsAppConfigForm";
import { BroadcastMonitor } from "./components/BroadcastMonitor";
import { SystemConfigForm } from "./components/SystemConfigForm";

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"email" | "whatsapp" | "system">("email");

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
              onClick={() => setActiveTab("email")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-all border-b-2 cursor-pointer ${
                activeTab === "email"
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
              onClick={() => setActiveTab("system")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-all border-b-2 cursor-pointer ${
                activeTab === "system"
                  ? "text-emerald-600 border-emerald-500 bg-emerald-500/10"
                  : "text-content-muted border-transparent hover:text-content-body"
              }`}
            >
              <Shield size={15} />
              {t("settings.systemOperational", "Sistem & Keamanan")}
            </button>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5">
            <div className={activeTab === "system" ? "lg:col-span-8" : "lg:col-span-5"}>
              {activeTab === "email" && (
                <EmailConfigForm formData={emailConfig} setFormData={setEmailConfig} />
              )}
              {activeTab === "whatsapp" && (
                <WhatsAppConfigForm formData={waConfig} setFormData={setWaConfig} />
              )}
              {activeTab === "system" && <SystemConfigForm />}
            </div>
            {activeTab !== "system" && (
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
