import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { TestTube, Loader2, Save, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { PasswordInput } from "./PasswordInput";
import { TemplateEditorModal } from "./TemplateEditorModal";

interface WhatsAppConfigFormProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const WhatsAppConfigForm: React.FC<WhatsAppConfigFormProps> = ({
  formData,
  setFormData,
}) => {
  const { t } = useTranslation();
  const [isTesting, setIsTesting] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testTargetNumber, setTestTargetNumber] = useState("");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const handleTestWhatsApp = async (targetNumber: string) => {
    setIsTesting(true);
    setIsTestModalOpen(false);
    // Mock API Call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsTesting(false);
    toast.success(`Koneksi WA Gateway Berhasil! Pesan simulasi sukses dikirim ke ${targetNumber}.`);
  };

  const handleSaveTemplate = (subject: string, body: string) => {
    setFormData((prev: any) => ({
      ...prev,
      messageTemplate: body,
    }));
    setIsTemplateModalOpen(false);
    toast.success("Template WhatsApp berhasil disimpan sementara.");
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

        <button className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-content-inverse px-3.5 py-1.5 rounded-md text-xs font-medium transition shadow-2xs cursor-pointer active:scale-95">
          <Save size={14} />
          {t("whatsapp.saveConfig")}
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
