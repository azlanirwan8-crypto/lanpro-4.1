import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Mail, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/CoreUI";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Masukkan alamat email yang valid.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();
      if (!response.ok || data.status === "error") {
        throw new Error(data.message || "Gagal mengirim permintaan.");
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setEmail("");
    setError(null);
    setIsSuccess(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={t("forgotPwd.title")}
      maxWidth="max-w-md"
      footer={
        isSuccess ? (
          <Button
            type="button"
            variant="secondary"
            onClick={handleModalClose}
            className="w-full justify-center"
          >
            {t("forgotPwd.backToLogin")}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={handleModalClose}
              disabled={loading}
              className="flex-1 justify-center"
            >
              {t("forgotPwd.cancel")}
            </Button>
            <Button
              type="submit"
              form="forgot-password-form"
              disabled={loading || !email.trim()}
              className="flex-1 justify-center gap-1.5"
            >
              <span>{loading ? t("common.sending") : t("forgotPwd.sendLink")}</span>
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </Button>
          </>
        )
      }
    >
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
          <Mail className="w-6 h-6" />
        </div>
        <p className="text-xs text-content-muted max-w-xs mx-auto">{t("forgotPwd.fpIntro")}</p>
      </div>

      {isSuccess ? (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold mb-0.5">{t("forgotPwd.checkInbox")}</p>
            {/* #121 — Pesan ini SENGAJA netral. Menyebut "berhasil dikirim ke
                alamat ini" akan mengonfirmasi bahwa alamat itu punya akun,
                dan membocorkan lagi hal yang baru saja ditutup di backend. */}
            <p className="text-content-muted">
              {t("forgotPwd.fpSentPrefix")} <strong>{email}</strong> {t("forgotPwd.fpSentSuffix")}
            </p>
          </div>
        </div>
      ) : (
        <form id="forgot-password-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-content-body block">
              {t("forgotPwd.emailAddress")} <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              placeholder={t("forgotPwd.emailPlaceholder")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              disabled={loading}
              className={cn(
                "w-full px-3.5 py-3 bg-surface-sunken border rounded-lg focus:bg-surface focus:ring-2 transition-all outline-none text-base font-normal text-content placeholder:text-content-subtle",
                error
                  ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600"
                  : "border-border-subtle focus:ring-primary/20 focus:border-primary"
              )}
            />
            {error && (
              <p className="text-xs font-medium text-rose-500 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
};
