import React, { useEffect } from "react";
import { X, Download, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  fileSize?: number;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  fileSize,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = title || "image";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex flex-col bg-overlay/85 backdrop-blur-md"
          onClick={onClose}
        >
          {/* Header Bar */}
          <div
            className="flex items-center justify-between px-4 py-3 bg-surface-inverse/40 border-b border-border-inverse/40 text-content-inverse shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0 pr-4">
              <span className="text-sm font-medium text-content-inverse truncate" title={title}>
                {title}
              </span>
              {fileSize !== undefined && fileSize > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-inverse/60 text-content-inverse/80 shrink-0">
                  {formatBytes(fileSize)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg text-content-inverse/80 hover:text-content-inverse hover:bg-surface-inverse/60 transition-colors"
                title={t("issueDetail.openOriginal", "Buka Asli")}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={handleDownload}
                className="p-2 rounded-lg text-content-inverse/80 hover:text-content-inverse hover:bg-surface-inverse/60 transition-colors"
                title={t("attachments.download", "Unduh")}
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-content-inverse/80 hover:text-content-inverse hover:bg-surface-inverse/60 transition-colors ml-1"
                title={t("attachments.closePreview", "Tutup Pratinjau")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image Display Area */}
          <div
            className="flex-1 flex items-center justify-center p-4 md:p-8 min-h-0 overflow-hidden"
            onClick={onClose}
          >
            <motion.img
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              src={imageUrl}
              alt={title}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[92vw] max-h-[82vh] object-contain rounded-lg shadow-2xl select-none"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
