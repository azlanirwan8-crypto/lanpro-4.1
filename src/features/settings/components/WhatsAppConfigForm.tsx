import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import { TestTube, Loader2, Save, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { PasswordInput } from "./PasswordInput";
import { TemplateEditorModal } from "./TemplateEditorModal";
import {
  fetchUsers,
  fetchWhatsAppBroadcastConfig,
  saveWhatsAppBroadcastConfig,
  fetchWhatsAppConnectionConfig,
  saveWhatsAppConnectionConfig,
} from "../services/settings.service";

interface WhatsAppConfigFormProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

interface RecipientUser {
  id: string;
  name: string;
}

const DAY_OPTIONS: { value: string; labelKey: string }[] = [
  { value: "1", labelKey: "whatsapp.dayMon" },
  { value: "2", labelKey: "whatsapp.dayTue" },
  { value: "3", labelKey: "whatsapp.dayWed" },
  { value: "4", labelKey: "whatsapp.dayThu" },
  { value: "5", labelKey: "whatsapp.dayFri" },
  { value: "6", labelKey: "whatsapp.daySat" },
  { value: "7", labelKey: "whatsapp.daySun" },
];

export const WhatsAppConfigForm: React.FC<WhatsAppConfigFormProps> = ({
  formData,
  setFormData,
}) => {
  const { t } = useTranslation();
  const [isTesting, setIsTesting] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testTargetNumber, setTestTargetNumber] = useState("");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recipientUsers, setRecipientUsers] = useState<RecipientUser[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [sendToAll, setSendToAll] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [usersRes, configRes, connRes] = await Promise.all([
          fetchUsers(),
          fetchWhatsAppBroadcastConfig(),
          fetchWhatsAppConnectionConfig(),
        ]);

        if (usersRes.status === "success" && Array.isArray(usersRes.data)) {
          setRecipientUsers(
            usersRes.data.map((u: any) => ({
              id: String(u.id),
              name: u.displayName || u.username || `User ${u.id}`,
            }))
          );
        }

        if (configRes.status === "success" && configRes.data) {
          const cfg = configRes.data;
          setSendToAll((cfg.recipientIds || []).length === 0);
          setFormData((prev: any) => ({
            ...prev,
            scheduleDays:
              cfg.scheduleDays.length > 0 ? cfg.scheduleDays : ["1", "2", "3", "4", "5", "6", "7"],
            scheduleTime: cfg.scheduleTime || "07:00",
            recipientIds: cfg.recipientIds || [],
            messageTemplate: cfg.messageTemplate || prev.messageTemplate,
          }));
        }

        if (connRes.status === "success" && connRes.data) {
          const conn = connRes.data;
          setFormData((prev: any) => ({
            ...prev,
            provider: conn.provider || prev.provider || "fonnte",
            endpoint: conn.endpoint || prev.endpoint || "https://api.fonnte.com/send",
            token: conn.tokenMasked || prev.token || "",
            senderNumber: conn.senderNumber || prev.senderNumber || "",
            deviceId: conn.deviceId || prev.deviceId || "",
          }));
        }
      } catch (err) {
        console.error("Failed to load WhatsApp config", err);
      }
    };

    loadAll();
  }, []);

  const scheduleDays: string[] = formData.scheduleDays || ["1", "2", "3", "4", "5", "6", "7"];
  const scheduleTime: string = formData.scheduleTime || "07:00";
  const recipientIds: string[] = formData.recipientIds || [];

  const toggleDay = (day: string) => {
    setFormData((prev: any) => {
      const current: string[] = prev.scheduleDays || [];
      const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
      return { ...prev, scheduleDays: next };
    });
  };

  const toggleRecipient = (userId: string) => {
    setFormData((prev: any) => {
      const current: string[] = prev.recipientIds || [];
      const next = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId];
      return { ...prev, recipientIds: next };
    });
  };

  const filteredUsers = recipientUsers.filter((u) =>
    u.name.toLowerCase().includes(recipientSearch.toLowerCase())
  );

  const handleTestWhatsApp = async (targetNumber: string) => {
    setIsTesting(true);
    setIsTestModalOpen(false);
    // Mock API Call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsTesting(false);
    toast.success(t("toast.waTestOk", { nomor: targetNumber }));
  };

  const handleSaveTemplate = (subject: string, body: string) => {
    setFormData((prev: any) => ({
      ...prev,
      messageTemplate: body,
    }));
    setIsTemplateModalOpen(false);
    toast.success(t("toast.waTemplateSaved"));
  };

  const handleSaveConfig = async () => {
    if (scheduleDays.length === 0) {
      toast.error(t("whatsapp.selectDayError"));
      return;
    }
    if (!sendToAll && recipientIds.length === 0) {
      toast.error(t("whatsapp.selectRecipientError"));
      return;
    }

    setIsSaving(true);
    try {
      const [broadcastRes, connRes] = await Promise.all([
        saveWhatsAppBroadcastConfig({
          scheduleDays,
          scheduleTime,
          recipientIds: sendToAll ? [] : recipientIds,
          messageTemplate: formData.messageTemplate || "",
        }),
        saveWhatsAppConnectionConfig({
          provider: formData.provider,
          endpoint: formData.endpoint,
          token: formData.token,
          senderNumber: formData.senderNumber,
          deviceId: formData.deviceId,
        }),
      ]);

      if (broadcastRes.status === "success" && connRes.status === "success") {
        toast.success(t("whatsapp.saveSuccess"));
      } else {
        toast.error(broadcastRes.message || connRes.message || t("whatsapp.saveFailed"));
      }
    } catch (err) {
      console.error("Failed to save WhatsApp config", err);
      toast.error(t("whatsapp.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle =
    "w-full px-3 py-1.5 border border-border-subtle rounded-md text-xs font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all bg-surface text-content-strong shadow-2xs";

  return (
    <div className="space-y-4 relative">
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-content-body">{t("whatsapp.provider")}</label>
          <select
            value={formData.provider}
            onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
            className={inputStyle}
          >
            <option>{t("whatsapp.providerLocal")}</option>
            <option>FlowKirim</option>
            <option>{t("whatsapp.customHttp")}</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-content-body">{t("whatsapp.baseUrl")}</label>
          <input
            value={formData.endpoint}
            onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
            placeholder={t("whatsapp.baseUrlPlaceholder")}
            className={inputStyle}
          />
        </div>

        <div>
          <PasswordInput
            label={t("whatsapp.apiToken")}
            value={formData.token}
            onChange={(val) => setFormData({ ...formData, token: val })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-content-body">
              {t("whatsapp.senderNumber")}
            </label>
            <input
              value={formData.senderNumber}
              onChange={(e) => setFormData({ ...formData, senderNumber: e.target.value })}
              placeholder={t("whatsapp.senderPlaceholder")}
              className={inputStyle}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-content-body">
              {t("whatsapp.deviceIdOptional")}
            </label>
            <input
              value={formData.deviceId}
              onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
              className={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Item #193 — Jadwal Broadcast */}
      <div className="space-y-2 pt-3 border-t border-border-faint">
        <label className="text-xs font-medium text-content-strong">
          {t("whatsapp.scheduleSection")}
        </label>

        <div className="space-y-1">
          <label className="text-xs text-content-muted">{t("whatsapp.scheduleDays")}</label>
          <div className="flex flex-wrap gap-1.5">
            {DAY_OPTIONS.map((day) => {
              const active = scheduleDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer ${
                    active
                      ? "bg-emerald-600 border-emerald-600 text-content-inverse"
                      : "bg-surface border-border-subtle text-content-body hover:bg-surface-sunken"
                  }`}
                >
                  {t(day.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-content-muted">{t("whatsapp.scheduleTime")}</label>
          <input
            type="time"
            value={scheduleTime}
            onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
            className={`${inputStyle} w-32`}
          />
        </div>
      </div>

      {/* Item #193 — Penerima Broadcast */}
      <div className="space-y-2 pt-3 border-t border-border-faint">
        <label className="text-xs font-medium text-content-strong">
          {t("whatsapp.recipientSection")}
        </label>

        <label className="flex items-center gap-2 text-xs text-content-body cursor-pointer">
          <input
            type="checkbox"
            checked={sendToAll}
            onChange={(e) => setSendToAll(e.target.checked)}
            className="cursor-pointer"
          />
          {t("whatsapp.recipientAll")}
        </label>

        {!sendToAll && (
          <div className="space-y-1.5">
            <input
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              placeholder={t("whatsapp.recipientSearchPlaceholder")}
              className={inputStyle}
            />
            <div className="text-xs text-content-subtle">
              {t("whatsapp.recipientSelectedCount", { jumlah: recipientIds.length })}
            </div>
            <div className="max-h-40 overflow-y-auto custom-scrollbar border border-border-faint rounded-md p-1.5 space-y-0.5 bg-surface-sunken/30">
              {filteredUsers.length === 0 ? (
                <div className="text-xs text-content-subtle px-1.5 py-1">
                  {t("whatsapp.recipientEmpty")}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 text-xs text-content-body px-1.5 py-1 rounded hover:bg-surface-muted cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={recipientIds.includes(user.id)}
                      onChange={() => toggleRecipient(user.id)}
                      className="cursor-pointer"
                    />
                    {user.name}
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5 items-center mt-4 pt-3 border-t border-border-faint">
        <button
          onClick={() => setIsTemplateModalOpen(true)}
          className="flex items-center gap-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 px-3 py-1.5 rounded-md text-xs font-medium transition mr-auto shadow-2xs cursor-pointer active:scale-95"
        >
          <FileEdit size={14} />
          {t("whatsapp.editTemplate")}
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
          disabled={isSaving}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-content-inverse px-3.5 py-1.5 rounded-md text-xs font-medium transition shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isSaving ? t("whatsapp.saving") : t("whatsapp.saveConfig")}
        </button>
      </div>

      {isTestModalOpen && (
        <div className="absolute inset-0 bg-overlay/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 rounded-lg">
          <div className="bg-surface p-5 rounded-lg shadow-xl max-w-sm w-full space-y-3 border border-border-subtle">
            <h3 className="font-medium text-sm text-content-strong">
              {t("whatsapp.testConnection")}
            </h3>
            <div className="space-y-1">
              <label className="text-xs text-content-muted">{t("whatsapp.targetNumber")}</label>
              <input
                value={testTargetNumber}
                onChange={(e) => setTestTargetNumber(e.target.value)}
                placeholder={t("whatsapp.testPlaceholder")}
                className={inputStyle}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="px-3 py-1.5 rounded-md text-content-secondary text-xs font-medium hover:bg-surface-muted transition-colors"
              >
                {t("whatsapp.cancel")}
              </button>
              <button
                onClick={() => handleTestWhatsApp(testTargetNumber)}
                className="px-3.5 py-1.5 rounded-md bg-emerald-600 text-content-inverse text-xs font-medium hover:bg-emerald-700 shadow-xs transition-colors"
              >
                {t("whatsapp.send")}
              </button>
            </div>
          </div>
        </div>
      )}

      <TemplateEditorModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        mode="whatsapp"
        initialBody={formData.messageTemplate}
        onSave={handleSaveTemplate}
      />
    </div>
  );
};
