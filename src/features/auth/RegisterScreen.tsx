import { useTranslation } from "react-i18next";
import React, { useState, useMemo } from "react";
import { ArrowRight, Eye, EyeOff, AlertCircle, X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../components/ui/CoreUI";
import { registrationSchema, evaluatePasswordStrength } from "../../lib/registrationSchema";
import { VelzonSuccessIcon } from "../../components/AuthToastContainer";
import { SsoButtons } from "./components/SsoButtons";
import type { RegisterScreenProps } from "./types";

export const RegisterScreen = ({ onRegister, onBackToLogin }: RegisterScreenProps) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    username?: string;
    password?: string;
  }>({});

  // Success Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Evaluate password strength
  const passStrength = useMemo(() => evaluatePasswordStrength(password), [password]);

  const handleNameChange = (val: string) => {
    if (val.length > 25) return;
    setName(val);
    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Allow only alphabetic letters
    const filteredVal = rawVal.replace(/[^a-zA-Z]/g, "").slice(0, 10);

    if (rawVal !== filteredVal) {
      setFieldErrors((prev) => ({ ...prev, username: t("regValidation.usernameLettersOnly") }));
    } else if (filteredVal.length > 10) {
      setFieldErrors((prev) => ({ ...prev, username: t("regValidation.usernameMax") }));
    } else {
      setFieldErrors((prev) => ({ ...prev, username: undefined }));
    }
    setUsername(filteredVal);
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Client-side Zod validation
    const result = registrationSchema.safeParse({ name, email, username, password });
    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          // `err.message` berisi KUNCI i18n, bukan teks (#171). Diterjemahkan
          // di sini, bukan di skema, supaya ganti bahasa ikut terasa.
          formattedErrors[err.path[0] as string] = t(err.message);
        }
      });
      setFieldErrors(formattedErrors);
      return;
    }

    if (isRegistering) return;
    setIsRegistering(true);
    try {
      const res = await onRegister(username, password, name, email);
      if (res && res.success) {
        setShowSuccessModal(true);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSuccessModalConfirm = () => {
    setShowSuccessModal(false);
    setName("");
    setEmail("");
    setUsername("");
    setPassword("");
    setFieldErrors({});
    onBackToLogin();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-border-faint/90 p-8 sm:p-10 relative z-10 font-sans mx-auto"
    >
      {/* Velzon Header */}
      <div className="text-center space-y-1.5 mb-6">
        <h2 className="text-2xl font-bold text-content-strong tracking-tight">
          {t("register.createAccount")}
        </h2>
        <p className="text-xs font-medium text-content-muted">{t("register.subtitle")}</p>
      </div>

      <form className="space-y-4" onSubmit={handleRegisterSubmit}>
        {/* FULL NAME INPUT */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-content-body tracking-wide block">
            {t("ui2.fullName")} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            maxLength={25}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={t("register.namePlaceholder")}
            className={cn(
              "w-full px-4 py-3 bg-surface-sunken border rounded-lg focus:bg-surface focus:ring-2 transition-all outline-none text-sm font-medium text-content placeholder:text-content-subtle",
              fieldErrors.name
                ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600"
                : "border-border-subtle focus:ring-primary/20 focus:border-primary"
            )}
          />
          {fieldErrors.name && (
            <p className="text-xs sm:text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.name}</span>
            </p>
          )}
        </div>

        {/* EMAIL ADDRESS INPUT */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-content-body tracking-wide block">
            {t("ui2.emailAddress")} <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder={t("register.emailPlaceholder")}
            className={cn(
              "w-full px-4 py-3 bg-surface-sunken border rounded-lg focus:bg-surface focus:ring-2 transition-all outline-none text-sm font-medium text-content placeholder:text-content-subtle",
              fieldErrors.email
                ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600"
                : "border-border-subtle focus:ring-primary/20 focus:border-primary"
            )}
          />
          {fieldErrors.email && (
            <p className="text-xs sm:text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.email}</span>
            </p>
          )}
        </div>

        {/* USERNAME INPUT */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-content-body tracking-wide block">
            {t("jsx.k18")} <span className="text-rose-500">*</span>{" "}
            <span className="text-xs sm:text-[11px] text-content-subtle font-normal">
              {t("jsx.k21")}
            </span>
          </label>
          <input
            type="text"
            maxLength={10}
            value={username}
            onChange={handleUsernameChange}
            placeholder={t("register.usernamePlaceholder")}
            className={cn(
              "w-full px-4 py-3 bg-surface-sunken border rounded-lg focus:bg-surface focus:ring-2 transition-all outline-none text-sm font-medium text-content placeholder:text-content-subtle",
              fieldErrors.username
                ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600"
                : "border-border-subtle focus:ring-primary/20 focus:border-primary"
            )}
          />
          {fieldErrors.username && (
            <p className="text-xs sm:text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.username}</span>
            </p>
          )}
        </div>

        {/* PASSWORD INPUT & STRENGTH METER */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-content-body tracking-wide block">
            {t("ui2.password")} <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder={t("register.passwordPlaceholder")}
              className={cn(
                "w-full pl-4 pr-11 py-3 bg-surface-sunken border rounded-lg focus:bg-surface focus:ring-2 transition-all outline-none text-sm font-medium text-content placeholder:text-content-subtle",
                fieldErrors.password
                  ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600"
                  : "border-border-subtle focus:ring-primary/20 focus:border-primary"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-content-subtle hover:text-primary focus:outline-none cursor-pointer transition-colors"
              title={showPassword ? t("ui2.hidePassword") : t("ui2.showPassword")}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password Strength Indicator Bar */}
          {password.length > 0 && (
            <div className="mt-2 space-y-1.5 p-2.5 bg-surface-sunken border border-border-subtle/80 rounded-lg">
              <div className="flex items-center justify-between text-xs sm:text-[11px] font-medium">
                <span className="text-content-secondary">{t("register.passwordStrength")}</span>
                <span className={passStrength.color}>{t(passStrength.label)}</span>
              </div>
              <div className="w-full bg-surface-strong rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300 rounded-full",
                    passStrength.barColor
                  )}
                  style={{ width: `${passStrength.percentage}%` }}
                />
              </div>

              {/* Criteria Checklist */}
              <div className="grid grid-cols-2 gap-1 text-xs sm:text-[10px] font-medium mt-1.5 text-content-muted">
                <div
                  className={cn(
                    "flex items-center gap-1",
                    passStrength.criteria.minLength
                      ? "text-emerald-600 font-medium"
                      : "text-content-subtle"
                  )}
                >
                  <span>{passStrength.criteria.minLength ? "[✓]" : "[ ]"}</span>{" "}
                  {t("ui2.min8Chars")}
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1",
                    passStrength.criteria.upper
                      ? "text-emerald-600 font-medium"
                      : "text-content-subtle"
                  )}
                >
                  <span>{passStrength.criteria.upper ? "[✓]" : "[ ]"}</span> {t("jsx.k22")}
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1",
                    passStrength.criteria.digit
                      ? "text-emerald-600 font-medium"
                      : "text-content-subtle"
                  )}
                >
                  <span>{passStrength.criteria.digit ? "[✓]" : "[ ]"}</span> {t("jsx.k23")}
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1",
                    passStrength.criteria.special
                      ? "text-emerald-600 font-medium"
                      : "text-content-subtle"
                  )}
                >
                  <span>{passStrength.criteria.special ? "[✓]" : "[ ]"}</span> {t("jsx.k24")}
                </div>
              </div>
            </div>
          )}

          {fieldErrors.password && (
            <p className="text-xs sm:text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.password}</span>
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isRegistering}
          className="w-full bg-primary-surface text-content-inverse py-3 rounded-lg font-semibold uppercase tracking-wider text-xs hover:bg-primary-surface-hover transition-all shadow-md shadow-primary/20 active:scale-[0.99] mt-3 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isRegistering ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>{t("register.creating")}</span>
            </>
          ) : (
            <>
              <span>{t("register.register")}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      {/* Alternatif daftar. Berbeda dari tombol di layar masuk: yang ini BOLEH
          membuat akun baru bila emailnya belum terdaftar (ketetapan F5.1 #3). */}
      <SsoButtons mode="daftar" />

      <p className="text-center text-xs font-medium text-content-muted pt-5 mt-4 border-t border-border-faint">
        {t("jsx.k25")}{" "}
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-primary font-semibold hover:text-primary-hover transition-colors ml-1 cursor-pointer hover:underline"
        >
          {t("register.signIn")}
        </button>
      </p>

      {/* REGISTRATION SUCCESS MODAL (VELZON SWEETALERT STYLE) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 backdrop-blur-xs p-4 font-sans">
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-surface rounded-xl p-8 max-w-md w-full shadow-2xl border border-border-faint text-center relative overflow-hidden space-y-4"
          >
            <button
              onClick={handleSuccessModalConfirm}
              className="absolute top-4 right-4 text-content-subtle hover:text-content-secondary transition-colors p-1 rounded-md"
              title={t("register.close")}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Velzon Party Cone Animated Icon */}
            <VelzonSuccessIcon />

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-content-strong tracking-tight">
                {t("register.successTitle")}
              </h3>
              <p className="text-sm text-content-muted font-normal leading-relaxed px-2">
                {t("register.successHint")}
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSuccessModalConfirm}
              className="px-8 py-2.5 bg-primary-surface hover:bg-primary-surface-hover text-content-inverse rounded-md text-sm font-semibold shadow-md transition-all cursor-pointer min-w-[120px] mt-2"
            >
              {t("register.toLoginPage")}
            </motion.button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
