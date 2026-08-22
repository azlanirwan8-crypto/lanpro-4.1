import { useTranslation } from "react-i18next";
import React from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Input, Button } from "../ui/CoreUI";
import { StyledDropdown } from "../ui/CommonComponents";
import { Project, PeranEfektif, UserProfile, MasterData } from "../../types";

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
  /** Sumber pilihan Status dan Metodologi (item #138). */
  masterData?: MasterData[];
}

/**
 * Cadangan bila MasterData belum berisi tipe yang diminta.
 *
 * Tanpa ini, tabel MasterData yang kosong akan membuat dropdown-nya kosong
 * juga — pengguna kehilangan kemampuan menyetel status sama sekali, yang
 * lebih buruk daripada daftar keras yang digantikan.
 */
const CADANGAN_STATUS = [
  { id: "Active", label: "Active", icon: "PlayCircle", color: "#10B981" },
  { id: "On Hold", label: "On Hold", icon: "PauseCircle", color: "#F59E0B" },
  { id: "Completed", label: "Completed", icon: "CheckCircle2", color: "#3B82F6" },
];
const CADANGAN_METODOLOGI = [
  { id: "Agile", label: "Agile", icon: "Repeat", color: "#10B981" },
  { id: "Scrum", label: "Scrum", icon: "Users", color: "#3B82F6" },
  { id: "Kanban", label: "Kanban", icon: "Columns3", color: "#8B5CF6" },
];

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
  masterData,
}) => {
  const { t } = useTranslation();

  // Item #146 — ikon dan warna ikut diteruskan supaya tampilannya sama dengan
  // dropdown MasterData lain (JENIS KATEGORI). Sumbernya tetap prop
  // `masterData`, bukan store: komponen ini sudah menerimanya, dan mengambil
  // dari store akan membuat prop yang ia deklarasikan diam-diam diabaikan.
  const opsiDariMaster = (tipe: string, cadangan: typeof CADANGAN_STATUS) => {
    const dari = (masterData || [])
      .filter((m) => m.type === tipe && m.label)
      .map((m) => ({
        id: m.label as string,
        label: m.label as string,
        icon: (m as { icon?: string }).icon,
        color: (m as { color?: string }).color,
      }));
    return dari.length ? dari : cadangan;
  };
  const opsiStatus = opsiDariMaster("project_status", CADANGAN_STATUS);
  const opsiMetodologi = opsiDariMaster("methodology", CADANGAN_METODOLOGI);
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
              <StyledDropdown
                value={editingProject.status || "Active"}
                onChange={(val) => setEditingProject({ ...editingProject, status: val })}
                options={opsiStatus}
                type="project_status"
                masterData={masterData || []}
                className="w-full"
                buttonClassName="w-full border border-border-subtle rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content-body mb-1">
                {t("editProject.methodology")}
              </label>
              <StyledDropdown
                value={editingProject.category || "Agile"}
                onChange={(val) => setEditingProject({ ...editingProject, category: val })}
                options={opsiMetodologi}
                type="methodology"
                masterData={masterData || []}
                className="w-full"
                buttonClassName="w-full border border-border-subtle rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content-body mb-1">
                {t("editProject.idRef")}
              </label>
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
