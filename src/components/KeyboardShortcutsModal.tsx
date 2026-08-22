/**
 * Daftar pintasan papan ketik aplikasi.
 *
 * Diekstrak dari AppContainer. JSX dipindah apa adanya; isinya statis sehingga
 * komponen ini hanya perlu tahu kapan harus tampil dan bagaimana menutup diri.
 */
import { useTranslation } from "react-i18next";
import React from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/CoreUI";

interface KeyboardShortcutsModalProps {
  isShortcutsModalOpen: boolean;
  setIsShortcutsModalOpen: (open: boolean) => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isShortcutsModalOpen,
  setIsShortcutsModalOpen,
}) => {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen={isShortcutsModalOpen}
      onClose={() => setIsShortcutsModalOpen(false)}
      title={t("shortcuts.title")}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-xs text-content-muted font-medium">
          Use these global shortcuts to navigate and perform common actions more efficiently.
        </p>
        <div className="divide-y divide-border-faint">
          <div className="flex justify-between items-center py-2.5">
            <span className="text-sm font-medium text-content-body">
              {t("shortcuts.openCreateTask")}
            </span>
            <kbd className="px-2.5 py-1 text-xs font-medium font-mono bg-surface-muted text-content-strong rounded border border-border-subtle shadow-soft">
              n
            </kbd>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-sm font-medium text-content-body">
              {t("shortcuts.openCreateProject")}
            </span>
            <kbd className="px-2.5 py-1 text-xs font-medium font-mono bg-surface-muted text-content-strong rounded border border-border-subtle shadow-soft">
              p
            </kbd>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-sm font-medium text-content-body">
              {t("shortcuts.focusSearch")}
            </span>
            <kbd className="px-2.5 py-1 text-xs font-medium font-mono bg-surface-muted text-content-strong rounded border border-border-subtle shadow-soft">
              /
            </kbd>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-sm font-medium text-content-body">
              {t("shortcuts.toggleShortcuts")}
            </span>
            <kbd className="px-2.5 py-1 text-xs font-medium font-mono bg-surface-muted text-content-strong rounded border border-border-subtle shadow-soft">
              ?
            </kbd>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-sm font-medium text-content-body">
              {t("shortcuts.closeModals")}
            </span>
            <kbd className="px-2.5 py-1 text-xs font-medium font-mono bg-surface-muted text-content-strong rounded border border-border-subtle shadow-soft">
              Esc
            </kbd>
          </div>
        </div>
        <div className="pt-2 flex justify-end">
          <Button
            onClick={() => setIsShortcutsModalOpen(false)}
            className="justify-center bg-indigo-600 hover:bg-indigo-700 text-content-inverse font-medium"
          >
            {t("shortcuts.gotIt")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
