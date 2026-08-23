import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, X } from "lucide-react";
import { cn } from "../../../lib/utils";

interface ResetPasswordModalProps {
  token: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  token,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !token) return null;

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return "Password minimal 8 karakter";
    if (!/[A-Z]/.test(pwd)) return "Password harus mengandung minimal 1 huruf besar (A-Z)";
    if (!/[a-z]/.test(pwd)) return "Password harus mengandung minimal 1 huruf kecil (a-z)";
    if (!/[0-9]/.test(pwd)) return "Password harus mengandung minimal 1 angka (0-9)";
    if (!/[@$!%*?&]/.test(pwd))
      return "Password harus mengandung minimal 1 simbol khusus (@$!%*?&)";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwdErr = validatePassword(newPassword);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();
      if (!response.ok || data.status === "error") {
        throw new Error(data.message || "Gagal mengatur ulang kata sandi.");
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memproses permintaan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-surface border border-border-subtle rounded-xl shadow-2xl p-6 overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-content-subtle hover:text-content rounded-lg hover:bg-surface-sunken transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-content-strong">{t("resetPwd.title")}</h3>
          <p className="text-xs text-content-muted mt-1 max-w-xs mx-auto">
            {t("resetPwd.subtitle")}
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-semibold mb-0.5">{t("resetPwd.successTitle")}</p>
                <p className="text-content-muted">{t("resetPwd.successHint")}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full py-2.5 px-4 bg-primary-surface text-content-inverse hover:bg-primary-surface-hover font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              {t("resetPwd.signInNow")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-content-body block">
                Kata Sandi Baru <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("resetPwd.newPlaceholder")}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  className={cn(
                    "w-full pl-3.5 pr-10 py-2.5 bg-surface-sunken border rounded-lg focus:bg-surface focus:ring-2 transition-all outline-none text-xs font-medium text-content placeholder:text-content-subtle",
                    error
                      ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600"
                      : "border-border-subtle focus:ring-primary/20 focus:border-primary"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-content-subtle hover:text-primary focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-content-body block">
                Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("resetPwd.repeatPlaceholder")}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                className={cn(
                  "w-full px-3.5 py-2.5 bg-surface-sunken border rounded-lg focus:bg-surface focus:ring-2 transition-all outline-none text-xs font-medium text-content placeholder:text-content-subtle",
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

            <div className="p-3 bg-surface-sunken rounded-lg border border-border-subtle text-[11px] text-content-subtle space-y-1">
              <p className="font-semibold text-content-body">{t("resetPwd.requirements")}</p>
              <ul className="list-disc pl-4 space-y-0.5 text-content-muted">
                <li>{t("resetPwd.minChars")}</li>
                <li>{t("resetPwd.ruleCase")}</li>
                <li>{t("resetPwd.ruleDigit")}</li>
                <li>{t("resetPwd.ruleSymbol")}</li>
              </ul>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-surface-sunken hover:bg-surface-elevated text-content font-medium rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {t("resetPwd.cancel")}
              </button>
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="flex-1 py-2.5 px-4 bg-primary-surface text-content-inverse hover:bg-primary-surface-hover font-semibold rounded-lg text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{loading ? t("ui2.saving") : t("ui2.savePassword")}</span>
                {!loading && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
