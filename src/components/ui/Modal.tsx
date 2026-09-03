import React from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Portal } from "./Portal";

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
  closeOnBackdropClick = true,
}: any) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <Portal>
      {/* #373 — HP: bottom sheet; md+: centered dialog (pola lama) */}
      <div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-overlay/60 backdrop-blur-xs"
        onClick={(e) => {
          if (closeOnBackdropClick && e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 48, scale: 1 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`bg-surface rounded-t-2xl md:rounded-lg shadow-xl w-full ${maxWidth} overflow-hidden max-h-[92vh] md:max-h-[90vh] flex flex-col border border-border-subtle md:mx-auto`}
        >
          <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0" aria-hidden>
            <div className="w-10 h-1 rounded-full bg-surface-marker" />
          </div>
          <div className="px-5 py-3.5 border-b border-border-subtle flex justify-between items-center shrink-0">
            <h3 className="text-base font-medium text-content">{title}</h3>
            <button
              onClick={onClose}
              className="text-content-subtle hover:text-content-secondary min-h-11 min-w-11 inline-flex items-center justify-center rounded-md hover:bg-surface-muted transition-colors"
            >
              <Plus className="rotate-45 w-5 h-5" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))] md:pb-5">
            {children}
          </div>
        </motion.div>
      </div>
    </Portal>
  );
};
