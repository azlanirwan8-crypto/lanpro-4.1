import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import { ArrowRight, Eye, EyeOff, AlertCircle, User, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { safeLocalStorage } from "../../lib/safeStorage";
import { cn } from "../../components/ui/CoreUI";
import { LoginSkeletonState } from "./components/LoginSkeletonState";
import { SsoButtons } from "./components/SsoButtons";
import { ForgotPasswordModal } from "./components/ForgotPasswordModal";
import { ResetPasswordModal } from "./components/ResetPasswordModal";
import type { LoginScreenProps } from "./types";

export const LoginScreen = ({
  onLogin,
  onRegisterClick,
  loading,
  loadingText,
}: LoginScreenProps) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState(() => {
    try {
      return safeLocalStorage.getItem("savedUsername") || "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return safeLocalStorage.getItem("rememberUser") === "true";
    } catch {
      return false;
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  useEffect(() => {
    try {
      const hash = window.location.hash || "";
      const search = window.location.search || "";
      let token: string | null = null;

      if (hash.includes("reset-password")) {
        const queryIdx = hash.indexOf("?");
        if (queryIdx !== -1) {
          const params = new URLSearchParams(hash.substring(queryIdx));
          token = params.get("token");
        }
      } else if (search.includes("token")) {
        const params = new URLSearchParams(search);
        token = params.get("token");
      }

      if (token) {
        setResetToken(token);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (rememberMe) {
        safeLocalStorage.setItem("savedUsername", username);
        safeLocalStorage.setItem("rememberUser", "true");
      } else {
        safeLocalStorage.removeItem("savedUsername");
        safeLocalStorage.setItem("rememberUser", "false");
      }
    } catch {}
  }, [username, rememberMe]);

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: undefined }));
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      errors.username = "Username wajib diisi";
    }
    if (!password.trim()) {
      errors.password = "Password wajib diisi";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(t("toast.loginFailedTitle"), {
        description: "Username dan Password wajib diisi terlebih dahulu.",
      });
      return;
    }

    setFieldErrors({});
    onLogin(username.trim(), password.trim(), rememberMe);
  };

  return (
    <div className="w-full max-w-md mx-auto relative">
      <AnimatePresence mode="wait">
        {loading ? (
          <div key="login-skeleton" className="w-full">
            <LoginSkeletonState loadingText={loadingText || t("auth.authenticating")} />
          </div>
        ) : (
          <motion.div
            key="login-form-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-md bg-surface rounded-2xl shadow-xl border border-border-subtle/80 p-8 sm:p-10 relative z-10 font-sans mx-auto"
          >
            {/* Velzon Card Header */}
            <div className="text-center space-y-1.5 mb-6">
              <h2 className="text-2xl font-bold text-content-strong tracking-tight">
                {t("login.signIn")}
              </h2>
              <p className="text-xs font-medium text-content-muted">{t("login.subtitle")}</p>
            </div>

            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              {/* USERNAME FIELD */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-content-body tracking-wide block">
                  {t("common.username")} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-content-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={t("login.usernamePlaceholder")}
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className={cn(
                      "w-full pl-10 pr-4 py-3 bg-surface-sunken border rounded-lg focus:bg-surface focus:ring-2 transition-all duration-200 outline-none text-sm font-normal text-content placeholder:text-content-subtle hover:border-border-subtle",
                      fieldErrors.username
                        ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600"
                        : "border-border-subtle focus:ring-primary/20 focus:border-primary"
                    )}
                  />
                </div>
                {fieldErrors.username && (
                  <p className="text-xs sm:text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.username}</span>
                  </p>
                )}
              </div>

              {/* PASSWORD FIELD */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-content-body tracking-wide block">
                  {t("login.password")} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-content-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("login.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className={cn(
                      "w-full pl-10 pr-11 py-3 bg-surface-sunken border rounded-lg focus:bg-surface focus:ring-2 transition-all duration-200 outline-none text-sm font-normal text-content placeholder:text-content-subtle hover:border-border-subtle",
                      fieldErrors.password
                        ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600"
                        : "border-border-subtle focus:ring-primary/20 focus:border-primary"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-content-subtle hover:text-primary focus:outline-none cursor-pointer transition-colors"
                    title={showPassword ? t("common.hidePassword") : t("common.showPassword")}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs sm:text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.password}</span>
                  </p>
                )}
              </div>

              {/* REMEMBER ME & FORGOT PASSWORD */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none py-2.5 -my-2.5">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="text-xs font-medium text-content-secondary">
                    {t("login.rememberMe")}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs font-medium text-primary hover:text-primary-hover hover:underline cursor-pointer transition-colors py-2.5 -my-2.5"
                >
                  {t("login.forgotPassword")}
                </button>
              </div>

              {/* SIGN IN BUTTON */}
              <button
                type="submit"
                disabled={loading || !username.trim() || !password.trim()}
                className="w-full bg-primary-surface text-content-inverse py-3 rounded-lg font-normal uppercase tracking-wider text-xs hover:bg-primary-surface-hover transition-all shadow-md shadow-primary/20 active:scale-[0.99] mt-3 flex items-center justify-center gap-2.5 group cursor-pointer disabled:bg-primary-surface/60 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{t("login.signIn")}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            {/* Alternatif masuk. Tidak menampilkan apa pun bila SSO belum dikonfigurasi. */}
            <SsoButtons mode="login" />

            <p className="text-center text-xs font-medium text-content-muted pt-5 mt-4 border-t border-border-faint">
              {t("login.donTHaveAnAccount")}{" "}
              <button
                type="button"
                onClick={onRegisterClick}
                className="text-primary font-semibold hover:text-primary-hover transition-colors ml-1 cursor-pointer hover:underline inline-block py-2.5 -my-2.5"
              >
                {t("login.signUp")}
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />

      {/* Reset Password Modal (Triggered by reset token in URL) */}
      <ResetPasswordModal
        isOpen={!!resetToken}
        token={resetToken}
        onClose={() => {
          setResetToken(null);
          try {
            window.location.hash = "";
          } catch {}
        }}
        onSuccess={() => {
          toast.success(t("toast.passwordUpdated"));
        }}
      />
    </div>
  );
};
