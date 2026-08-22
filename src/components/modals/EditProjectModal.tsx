import { useTranslation } from "react-i18next";
import React from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Input, Button } from "../ui/CoreUI";
import { Project, PeranEfektif, UserProfile } from "../../types";

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProject: Project | null;
  setEditingProject: (proj: Project | null) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  effectiveRole: PeranEfektif;
  currentUser: UserProfile | null;
  user: UserProfile | null;
  currentUserProfile: UserProfile | null;
  hasPermission: any;
  deleteProject: (project: Project) => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  editingProject,
  setEditingProject,
  onSubmit,
  isSubmitting,
  effectiveRole,
  currentUser,
  user,
  currentUserProfile,
  hasPermission,
  deleteProject,
}) => {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("editProject.title")} maxWidth="max-w-2xl">
      {editingProject && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              {t("editProject.projectName")}
            </label>
            <Input
              value={editingProject.name ?? ""}
              onChange={(e: any) =>
                setEditingProject({
                  ...editingProject,
                  name: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              {t("editProject.projectKey")}
            </label>
            <Input
              value={editingProject.key ?? ""}
              onChange={(e: any) =>
                setEditingProject({
                  ...editingProject,
                  key: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-body mb-1">
              {t("editProject.description")}
            </label>
            <textarea
              value={editingProject.description || ""}
              onChange={(e) =>
                setEditingProject({
                  ...editingProject,
                  description: e.target.value,
                })
              }
              className="w-full border border-border-subtle rounded-lg p-2 text-sm"
              placeholder={t("editProject.descriptionPlaceholder")}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content-body mb-1">
                {t("editProject.status")}
              </label>
              <select
                value={editingProject.status || "Active"}
                onChange={(e) =>
                  setEditingProject({
                    ...editingProject,
                    status: e.target.value as any,
                  })
                }
                className="w-full border border-border-subtle rounded-lg p-2 text-sm"
              >
                <option value="Active">{t("editProject.active")}</option>
                <option value="On Hold">{t("ui.onHold")}</option>
                <option value="Completed">Completed</option>
                <option value="Archived">{t("ui.archived")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-content-body mb-1">ID (Ref)</label>
              <div className="px-3 py-2 bg-surface-sunken rounded-lg text-sm text-content-muted font-mono border border-border-faint italic">
                #{editingProject.id.slice(-6).toUpperCase()}
              </div>
            </div>
          </div>
          <div className="pt-2">
            <Button onClick={onSubmit} disabled={isSubmitting} className="w-full justify-center">
              {t("editProject.saveChanges")}
            </Button>
          </div>

          {hasPermission(
            effectiveRole,
            "configuration",
            "delete",
            (currentUser?.uid || user?.uid) === editingProject.ownerId,
            currentUserProfile?.permissions
          ) && (
            <div className="mt-6 pt-6 border-t border-red-50">
              <p className="text-xs sm:text-[10px] font-medium text-red-400 uppercase tracking-widest mb-3">
                {t("ui.dangerZone")}
              </p>
              <Button
                onClick={() => deleteProject(editingProject)}
                variant="danger"
                className="w-full justify-center"
              >
                <Trash2 className="w-4 h-4" />
                {t("editProject.terminate")}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
