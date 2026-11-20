import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { safeLocalStorage } from "../../lib/safeStorage";
import { Button, cn } from "../../components/ui/CoreUI";
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
        description: t("toast.loginFillRequired"),
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
                <label
                  htmlFor="lanpro-login-username"
                  className="text-xs font-medium text-content-body tracking-normal block"
                >
                  {t("common.username")} <span className="text-danger-text">*</span>
                </label>
                <input
                  id="lanpro-login-username"
                  type="text"
                  autoComplete="username"
                  placeholder={t("login.usernamePlaceholder")}
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className={cn(
                    "w-full h-11 px-3.5 bg-surface border rounded-md focus:ring-2 transition-colors outline-none text-base font-normal text-content placeholder:text-content-muted",
                    fieldErrors.username
                      ? "border-danger focus:ring-danger/20 focus:border-danger"
                      : "border-border-subtle focus:ring-primary/20 focus:border-primary"
                  )}
                />
                {fieldErrors.username && (
                  <p className="text-[11px] font-medium text-danger-text flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.username}</span>
                  </p>
                )}
              </div>

              {/* PASSWORD FIELD */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-x-2">
                  <label
                    htmlFor="lanpro-login-password"
                    className="text-xs font-medium text-content-body tracking-normal block"
                  >
                    {t("login.password")} <span className="text-danger-text">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs font-medium text-primary hover:text-primary-hover hover:underline cursor-pointer transition-colors py-2.5 -my-2.5"
                  >
                    {t("login.forgotPassword")}
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    id="lanpro-login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder={t("login.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className={cn(
                      "w-full h-11 pl-3.5 pr-11 bg-surface border rounded-md focus:ring-2 transition-colors outline-none text-base font-normal text-content placeholder:text-content-muted",
                      fieldErrors.password
                        ? "border-danger focus:ring-danger/20 focus:border-danger"
                        : "border-border-subtle focus:ring-primary/20 focus:border-primary"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-content-subtle hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer transition-colors"
                    title={showPassword ? t("common.hidePassword") : t("common.showPassword")}
                    aria-label={showPassword ? t("common.hidePassword") : t("common.showPassword")}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] font-medium text-danger-text flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.password}</span>
                  </p>
                )}
              </div>

              {/* REMEMBER ME */}
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
              </div>

              {/* SIGN IN BUTTON */}
              <Button
                type="submit"
                variant="success"
                size="lg"
                disabled={loading || !username.trim() || !password.trim()}
                className="w-full mt-3"
              >
                {t("login.signIn")}
              </Button>
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
