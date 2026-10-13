import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useRef } from "react";
import { cn } from "../lib/utils";
import { EDITOR_DESKRIPSI } from "./ui/gayaForm";

interface Props {
  task: any;
  onSave: (value: string) => void;
  onCancel: () => void;
  onAutoSave?: (value: string) => void;
}

export const DescriptionEditor: React.FC<Props> = ({ task, onSave, onCancel, onAutoSave }) => {
  const { t } = useTranslation();
  const [localDescription, setLocalDescription] = useState(task.description || "");
  const saveTimeout = useRef<any>(null);

  useEffect(() => {
    if (onAutoSave && localDescription !== (task.description || "")) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        onAutoSave(localDescription);
      }, 1000);
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [localDescription, onAutoSave, task.description]);

  return (
    <div className="border border-primary rounded-xl overflow-hidden bg-surface shadow-soft-lg ring-4 ring-primary/10 transition-all">
      <textarea
        value={localDescription}
        onChange={(e) => setLocalDescription(e.target.value)}
        placeholder={t("ui.descPlaceholder")}
        rows={8}
        className={EDITOR_DESKRIPSI}
        autoFocus
        onBlur={() => onSave(localDescription)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onSave(localDescription);
          }
        }}
      />
      <div className="bg-surface-sunken border-t border-border-subtle px-4 py-3 flex justify-between items-center text-xs sm:text-[10px] font-medium text-content-subtle">
        <span>{t("common.markdownFullySupportedAutoSaves")}</span>
      </div>
    </div>
  );
};
