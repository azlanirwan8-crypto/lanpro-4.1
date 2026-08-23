import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import type { LoginSkeletonStateProps } from "../types";

export const LoginSkeletonState = ({ loadingText }: LoginSkeletonStateProps) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-sm bg-surface rounded-2xl shadow-2xl border border-border-faint/90 p-8 sm:p-10 relative z-10 font-sans mx-auto text-center space-y-6"
    >
      {/* Velzon Center Animated Logo Icon */}
      <div className="relative inline-flex items-center justify-center pt-2">
        <motion.div
          className="w-16 h-16 rounded-2xl bg-primary-surface text-content-inverse flex items-center justify-center shadow-soft-lg shadow-primary/30 relative z-10"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          <span className="text-xl font-extrabold tracking-wider text-amber-400">LP</span>
        </motion.div>
        {/* Pulsing Outer Ring */}
        <motion.div
          className="absolute inset-0 rounded-2xl bg-primary-surface/25"
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      </div>

      {/* Loading Status & Message */}
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-content-strong tracking-tight flex items-center justify-center gap-1.5">
          <span>{loadingText || t("ui2.authenticating")}</span>
          <span className="flex space-x-1">
            <span className="w-1.5 h-1.5 bg-primary-surface rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-primary-surface rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 bg-primary-surface rounded-full animate-bounce [animation-delay:0.4s]" />
          </span>
        </h3>
        <p className="text-xs text-content-subtle font-medium">{t("ui.verifyingSession")}</p>
      </div>

      {/* Velzon Smooth Gradient Progress Bar */}
      <div className="w-full bg-surface-muted rounded-full h-1.5 overflow-hidden relative">
        <motion.div
          className="bg-gradient-to-r from-amber-400 via-info to-cyan-400 h-full rounded-full"
          animate={{ width: ["10%", "90%", "35%", "95%"] }}
          transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
};
