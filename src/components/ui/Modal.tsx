import React from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Portal } from "./Portal";
import { cn } from "../../lib/utils";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Optional footer (actions). Velzon modal-footer pattern. */
  footer?: React.ReactNode;
  maxWidth?: string;
  closeOnBackdropClick?: boolean;
  className?: string;
  bodyClassName?: string;
  /** Hide default header (custom chrome inside children). */
  hideHeader?: boolean;
};

/**
 * #401 — Modal chrome Velzon: sheet di HP, dialog di md+, header + body + footer opsional.
 * Motion singkat (bukan slide dramatis) agar selaras waves/#403.
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-lg",
  closeOnBackdropClick = true,
  className,
  bodyClassName,
  hideHeader = false,
}: ModalProps) => {
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
      {/* #373 — HP: bottom sheet; md+: centered dialog */}
      <div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-overlay/60 backdrop-blur-xs"
        onClick={(e) => {
          if (closeOnBackdropClick && e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={cn(
            "bg-surface rounded-t-2xl md:rounded-lg shadow-xl w-full overflow-hidden max-h-[92vh] md:max-h-[90vh] flex flex-col border border-border-subtle md:mx-auto",
            maxWidth,
            className
          )}
        >
          <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0" aria-hidden>
            <div className="w-10 h-1 rounded-full bg-surface-marker" />
          </div>
          {!hideHeader && title != null && (
            <div className="px-5 py-3.5 border-b border-border-subtle flex justify-between items-center shrink-0 gap-3">
              <h3 className="text-base font-medium text-content-strong min-w-0 truncate">
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-content-subtle hover:text-content-secondary min-h-11 min-w-11 inline-flex items-center justify-center rounded-md hover:bg-surface-muted transition-colors shrink-0"
              >
                <Plus className="rotate-45 w-5 h-5" />
              </button>
            </div>
          )}
          <div
            className={cn(
              "p-5 overflow-y-auto flex-1 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:pb-5",
              bodyClassName
            )}
          >
            {children}
          </div>
          {footer != null && (
            <div className="px-5 py-3.5 border-t border-border-subtle bg-surface-sunken/40 flex flex-wrap items-center justify-end gap-2 shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))] md:pb-3.5">
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </Portal>
  );
};
