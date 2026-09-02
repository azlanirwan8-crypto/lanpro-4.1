import { useTranslation } from "react-i18next";
import { StyledDropdown } from "../../components/ui/CommonComponents";
import React from "react";
import {
  Settings,
  Plus,
  Trash2,
  Edit,
  Search,
  Layers,
  GripVertical,
  Tag,
  Menu,
  X,
} from "lucide-react";
import {
  DragDropContext,
  Droppable as _Droppable,
  Draggable as _Draggable,
} from "@hello-pangea/dnd";

const Droppable = _Droppable as any;
const Draggable = _Draggable as any;
import { toast } from "sonner";
import { MasterData, AppRole, PeranEfektif, UserProfile } from "../../types";
import { Modal } from "../../components/ui/Modal";
import { confirmDeleteAlert, showSuccessAlert } from "../../lib/sweetalert";
import { RenderIcon, AVAILABLE_ICONS } from "../../components/RenderIcon";
import { cn } from "../../lib/utils";
import { useMobileAction } from "../../contexts/MobileActionContext";
import {
  fetchProjectModules as fetchProjectModulesApi,
  createProjectModule,
  updateProjectModule,
  deleteProjectModule,
  createMasterData,
  updateMasterData,
  // Diberi alias: komponen sudah punya handler lokal bernama deleteMasterData
  // yang membungkus konfirmasi dan pembaruan state. Tanpa alias, binding lokal
  // itu membayangi import ini dan panggilan justru mengenai handler-nya sendiri.
  deleteMasterData as deleteMasterDataApi,
  reorderMasterData,
} from "./services/master.service";

const Input = ({ value, onChange, placeholder, type = "text", className = "", ...props }: any) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full px-4 py-3 bg-surface-sunken border border-border-subtle rounded-xl text-sm font-normal text-content-strong placeholder:text-content-subtle placeholder:font-normal focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-surface outline-none transition-all ${className}`}
    {...props}
  />
);

const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  size = "md",
}: any) => {
  const baseStyle =
    "inline-flex items-center justify-center font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none";
  let variantStyle = "";
  if (variant === "primary")
    variantStyle =
      "bg-indigo-600 text-content-inverse hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-600/20";
  if (variant === "secondary")
    variantStyle = "bg-surface-muted text-content-body hover:bg-surface-strong active:scale-95";
  if (variant === "outline")
    variantStyle =
      "border-2 border-border-subtle text-content-body hover:border-border-subtle hover:bg-surface-sunken active:scale-95";
  if (variant === "danger")
    variantStyle =
      "bg-rose-500 text-content-inverse hover:bg-rose-600 active:scale-95 shadow-md shadow-rose-500/20";
  if (variant === "ghost")
    variantStyle =
      "bg-transparent text-content-secondary hover:bg-surface-muted hover:text-content active:scale-95";

  let sizeStyle = "";
  if (size === "sm") sizeStyle = "px-3 py-1.5 text-xs rounded-lg";
  if (size === "md") sizeStyle = "px-4 py-2 text-sm rounded-xl";
  if (size === "lg") sizeStyle = "px-6 py-3 text-base rounded-xl";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`}
    >
      {children}
    </button>
  );
};

export const MasterDataPanel = ({
  projects = [],
  tasks = [],
  masterData,
  userRole,
  currentUserProfile,
  hasPermission,
  onRefresh,
}: {
  projects?: any[];
  tasks?: any[];
  masterData: MasterData[];
  userRole: PeranEfektif | null;
  currentUserProfile: UserProfile | null;
  hasPermission: (...args: any[]) => boolean;
  onRefresh: () => void;
}) => {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = React.useState<string>("priority");
  const [isNewMasterModalOpen, setIsNewMasterModalOpen] = React.useState(false);
  const [editingMaster, setEditingMaster] = React.useState<MasterData | null>(null);
  const [isEditMasterModalOpen, setIsEditMasterModalOpen] = React.useState(false);

  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const [newMasterType, setNewMasterType] = React.useState<string>("status");
  const [newMasterLabel, setNewMasterLabel] = React.useState("");
  const [newMasterColor, setNewMasterColor] = React.useState("#3b82f6");
  const [newMasterIcon, setNewMasterIcon] = React.useState("CircleDot");
  const [newMasterShortCode, setNewMasterShortCode] = React.useState("");
  const [newMasterHierarchy, setNewMasterHierarchy] = React.useState("Standard");
  const [newMasterStatusGroup, setNewMasterStatusGroup] = React.useState("To Do");
  const [newMasterIsTerminal, setNewMasterIsTerminal] = React.useState(false);
  const [newMasterBaseUrl, setNewMasterBaseUrl] = React.useState("");
  const [newMasterRoleType, setNewMasterRoleType] = React.useState<"PROJECT" | "SYSTEM">("PROJECT");
  const [roleTabFilter, setRoleTabFilter] = React.useState<"ALL" | "PROJECT" | "SYSTEM">("ALL");

  React.useEffect(() => {
    setRoleTabFilter("ALL");
  }, [selectedType]);

  const [iconSearch, setIconSearch] = React.useState("");
  const [editIconSearch, setEditIconSearch] = React.useState("");

  // Modul / Aplikasi custom states
  const [projectModules, setProjectModules] = React.useState<any[]>([]);
  const [loadingModules, setLoadingModules] = React.useState(false);

  const [localMasterData, setLocalMasterData] = React.useState<MasterData[]>(masterData);

  React.useEffect(() => {
    setLocalMasterData(masterData);
  }, [masterData]);

  const [isNewModuleModalOpen, setIsNewModuleModalOpen] = React.useState(false);
  const [newModuleProjectId, setNewModuleProjectId] = React.useState("");
  const [newModuleNamaModul, setNewModuleNamaModul] = React.useState("");
  const [newModuleKeterangan, setNewModuleKeterangan] = React.useState("");

  // #358 — FAB navbar: buka modal Tambah Master / Modul
  const { registerAction, unregisterAction } = useMobileAction();
  const canAddMaster = hasPermission(
    userRole as PeranEfektif,
    "configuration",
    "update",
    false,
    currentUserProfile?.permissions
  );
  const openAddMaster = React.useCallback(() => {
    if (selectedType === "modul_aplikasi") {
      setNewModuleProjectId(projects?.[0]?.id || "");
      setNewModuleNamaModul("");
      setNewModuleKeterangan("");
      setIsNewModuleModalOpen(true);
    } else {
      setNewMasterType(selectedType);
      setNewMasterLabel("");
      setNewMasterShortCode("");
      setNewMasterBaseUrl("");
      setIsNewMasterModalOpen(true);
    }
  }, [selectedType, projects]);
  React.useEffect(() => {
    if (canAddMaster) {
      registerAction({
        id: "master-add-new",
        label: t("master.addItem", "Tambah"),
        onClick: openAddMaster,
        canCreate: true,
      });
    } else {
      unregisterAction("master-add-new");
    }
    return () => unregisterAction("master-add-new");
  }, [canAddMaster, openAddMaster, registerAction, unregisterAction, t]);

  const [isEditModuleModalOpen, setIsEditModuleModalOpen] = React.useState(false);
  const [editingModuleId, setEditingModuleId] = React.useState("");
  const [editingModuleProjectId, setEditingModuleProjectId] = React.useState("");
  const [editingModuleNamaModul, setEditingModuleNamaModul] = React.useState("");
  const [editingModuleKeterangan, setEditingModuleKeterangan] = React.useState("");
  /** #309 — laci kategori di bawah md; desktop tetap sidebar 260px. */
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const fetchProjectModules = async () => {
    setLoadingModules(true);
    try {
      const res = await fetchProjectModulesApi();
      if (res.status === "success") {
        setProjectModules(res.data || []);
      }
    } catch (e) {
      console.error("Gagal mengambil data modul", e);
    } finally {
      setLoadingModules(false);
    }
  };

  React.useEffect(() => {
    fetchProjectModules();
  }, []);

  const getUsageCount = (item: MasterData) => {
    if (!tasks || tasks.length === 0) return 0;
    const labelLower = (item.label || "").toLowerCase();
    return tasks.filter(
      (t: any) =>
        (t.status && t.status.toLowerCase() === labelLower) ||
        (t.priority && t.priority.toLowerCase() === labelLower) ||
        (t.type && t.type.toLowerCase() === labelLower) ||
        (t.environment && t.environment.toLowerCase() === labelLower) ||
        (t.category && t.category.toLowerCase() === labelLower)
    ).length;
  };

  const handleCreateModule = async () => {
    if (!newModuleProjectId) {
      toast.error(t("toast.pickProjectFirst"));
      return;
    }
    if (!newModuleNamaModul.trim()) {
      toast.error(t("toast.moduleNameEmpty"));
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        projectId: newModuleProjectId,
        namaModul: newModuleNamaModul.trim(),
        keterangan: newModuleKeterangan.trim(),
      };
      const res = await createProjectModule(payload);
      if (res.status !== "success") throw new Error(res.message);
      toast.success(t("toast.moduleAdded"));
      setIsNewModuleModalOpen(false);
      setNewModuleNamaModul("");
      setNewModuleKeterangan("");
      fetchProjectModules();
    } catch (e: any) {
      toast.error(t("toast.moduleAddFailed") + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateModule = async () => {
    if (!editingModuleProjectId) {
      toast.error(t("toast.pickProjectFirst"));
      return;
    }
    if (!editingModuleNamaModul.trim()) {
      toast.error(t("toast.moduleNameEmpty"));
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        projectId: editingModuleProjectId,
        namaModul: editingModuleNamaModul.trim(),
        keterangan: editingModuleKeterangan.trim(),
      };
      const res = await updateProjectModule(editingModuleId, payload);
      if (res.status !== "success") throw new Error(res.message);
      toast.success(t("toast.moduleUpdated"));
      setIsEditModuleModalOpen(false);
      fetchProjectModules();
    } catch (e: any) {
      toast.error(t("toast.moduleUpdateFailed") + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredNewIcons = React.useMemo(() => {
    return AVAILABLE_ICONS.filter(
      (i) =>
        i.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
        i.id.toLowerCase().includes(iconSearch.toLowerCase())
    );
  }, [iconSearch]);

  const filteredEditIcons = React.useMemo(() => {
    return AVAILABLE_ICONS.filter(
      (i) =>
        i.label.toLowerCase().includes(editIconSearch.toLowerCase()) ||
        i.id.toLowerCase().includes(editIconSearch.toLowerCase())
    );
  }, [editIconSearch]);

  // #84 — daftar tipe TIDAK lagi ditulis lengkap di sini.
  //
  // Versi lama mencantumkan 14 tipe secara tetap, sehingga tipe baru yang
  // ditambahkan ke database TIDAK PERNAH MUNCUL di layar sampai berkas ini ikut
  // disunting. Itu terjadi persis pada `project_status` dan `methodology`: data
  // masuk dengan benar, tetapi tidak terlihat siapa pun.
  //
  // Kini daftarnya diturunkan dari data. `LABEL_TIPE` hanya memperindah nama
  // yang sudah dikenal; tipe di luar daftar itu tetap tampil, dengan namanya
  // dirapikan otomatis — jadi menambah tipe baru cukup lewat database.
  /**
   * Item #147 — nama tipe kini dari kamus, bukan ditulis di sini.
   *
   * Versi lama campur bahasa dalam satu daftar: "Priority", "Status", tetapi
   * "Jenis Dokumen" dan "Modul / Aplikasi". Judul panel dan tombolnya memakai
   * nama itu apa adanya, sehingga di mode Inggris pun muncul "Add Jenis
   * Dokumen" — persis yang dilaporkan pemilik proyek.
   *
   * Tipe di luar daftar tetap tampil dengan nama yang dirapikan otomatis (#84),
   * jadi menambah tipe baru lewat basis data tidak menuntut berkas ini disunting.
   */
  const LABEL_TIPE: Record<string, string> = React.useMemo(
    () =>
      Object.fromEntries(
        (
          [
            "priority",
            "status",
            "category",
            "project_role",
            "project_status",
            "methodology",
            "issue_type",
            "environment",
            "department",
            "jabatan",
            "release",
            "fitur",
            "system",
            "surrounding",
            "jenis_dokumen",
            "modul_aplikasi",
            "sprint_status",
            "qa_phase",
            "qa_status",
            "project_risk",
            "resolution",
          ] as const
        ).map((k) => [k, t(`masterTypes.${k}`)])
      ),
    [t]
  );

  const URUTAN_TIPE = Object.keys(LABEL_TIPE);

  const rapikanNamaTipe = (t: string) =>
    t
      .split(/[_-]/)
      .filter(Boolean)
      .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
      .join(" ");

  const masterDataTypes = React.useMemo(() => {
    // modul_aplikasi bersumber dari tabel ProjectModules (item #86),
    // bukan dari tabel MasterData, sehingga disertakan secara eksplisit.
    const dariData = Array.from(
      new Set([
        ...((localMasterData || []).map((d) => d.type).filter(Boolean) as string[]),
        "modul_aplikasi",
      ])
    );
    // Tipe yang dikenal tampil lebih dulu sesuai urutan LABEL_TIPE; sisanya
    // menyusul menurut abjad supaya tetap dapat ditebak.
    const dikenal = URUTAN_TIPE.filter((t) => dariData.includes(t));
    const belumDikenal = dariData.filter((t) => !URUTAN_TIPE.includes(t)).sort();
    return [...dikenal, ...belumDikenal].map((type) => ({
      type,
      label: LABEL_TIPE[type] || rapikanNamaTipe(type),
    }));
    // Item #147 — LABEL_TIPE WAJIB ada di sini. Tanpa itu nama tipe dibekukan
    // pada bahasa saat render pertama, dan tombolnya jadi setengah berganti:
    // "Add Prioritas". Kelas cacat yang sama pernah ditemukan di #135
    // (DashboardView, TeamManagementPanel).
  }, [localMasterData, LABEL_TIPE]);

  const handleCreateMasterData = async () => {
    if (!newMasterLabel) {
      toast.error(t("toast.masterLabelEmpty"));
      return;
    }

    if (newMasterType === "project_role") {
      const trimmedLabel = newMasterLabel.trim();
      if (trimmedLabel.length < 3) {
        toast.error(t("toast.roleNameTooShort"));
        return;
      }
      if (/^(.)\1+$/i.test(trimmedLabel)) {
        toast.error(t("toast.roleNameRepeated"));
        return;
      }
      const lowerLabel = trimmedLabel.toLowerCase();
      if (
        lowerLabel === "asdf" ||
        lowerLabel === "qwer" ||
        lowerLabel === "zxcv" ||
        lowerLabel === "junk" ||
        lowerLabel === "test" ||
        lowerLabel === "testing" ||
        lowerLabel === "dd"
      ) {
        toast.error(t("toast.roleNameJunk"));
        return;
      }
    }

    setIsSaving(true);
    try {
      const typeItems = masterData.filter((d) => d.type === newMasterType);
      const nextOrder =
        typeItems.length > 0 ? Math.max(...typeItems.map((d) => d.order || 0)) + 1 : 0;

      let description = "";
      if (selectedType === "priority" && newMasterShortCode)
        description = `Code: ${newMasterShortCode}`;
      if (selectedType === "issue_type" && newMasterHierarchy)
        description = `Hierarchy: ${newMasterHierarchy}`;
      if (selectedType === "status" && newMasterStatusGroup)
        description = `Group: ${newMasterStatusGroup}`;
      if (selectedType === "environment" && newMasterBaseUrl)
        description = `URL: ${newMasterBaseUrl}`;

      const payload = {
        type: newMasterType,
        label: newMasterLabel,
        color: newMasterColor,
        icon: newMasterIcon,
        order: nextOrder,
        description,
        role_type: newMasterType === "project_role" ? newMasterRoleType : null,
        isTerminal: newMasterType === "status" ? newMasterIsTerminal : false,
        createdBy: currentUserProfile?.uid || "system",
      };

      const data = await createMasterData(payload);
      if (data.status !== "success") throw new Error(data.message);

      toast.success(t("toast.masterAdded"));
      setIsNewMasterModalOpen(false);
      setNewMasterLabel("");
      setNewMasterShortCode("");
      setNewMasterBaseUrl("");
      setNewMasterIsTerminal(false);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      toast.error(t("toast.masterAddFailed") + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMasterData = async () => {
    if (!editingMaster) return;

    if (editingMaster.type === "project_role") {
      const trimmedLabel = (editingMaster.label || "").trim();
      if (trimmedLabel.length < 3) {
        toast.error(t("toast.roleNameTooShort"));
        return;
      }
      if (/^(.)\1+$/i.test(trimmedLabel)) {
        toast.error(t("toast.roleNameRepeated"));
        return;
      }
      const lowerLabel = trimmedLabel.toLowerCase();
      if (
        lowerLabel === "asdf" ||
        lowerLabel === "qwer" ||
        lowerLabel === "zxcv" ||
        lowerLabel === "junk" ||
        lowerLabel === "test" ||
        lowerLabel === "testing" ||
        lowerLabel === "dd"
      ) {
        toast.error(t("toast.roleNameJunk"));
        return;
      }
    }

    setIsSaving(true);
    try {
      const data = await updateMasterData(editingMaster.id, {
        label: editingMaster.label,
        color: editingMaster.color,
        icon: editingMaster.icon,
        description: editingMaster.description,
        isTerminal: !!editingMaster.isTerminal,
        role_type:
          editingMaster.type === "project_role"
            ? editingMaster.roleType || editingMaster.role_type || "PROJECT"
            : null,
      });
      if (data.status !== "success") throw new Error(data.message);

      toast.success(t("toast.masterUpdated"));
      setIsEditMasterModalOpen(false);
      setEditingMaster(null);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      toast.error(t("toast.masterUpdateFailed") + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMasterData = async (item: { id: string; label: string; isModule?: boolean }) => {
    const isConfirmed = await confirmDeleteAlert(
      "Apakah Anda Yakin?",
      `Data master "${item.label}" akan dihapus secara permanen dan tidak dapat dikembalikan!`
    );
    if (!isConfirmed) return;

    setIsDeleting(true);
    try {
      if (item.isModule || item.label.includes("(Modul)")) {
        const data = await deleteProjectModule(item.id);
        if (data.status !== "success") throw new Error(data.message);
        showSuccessAlert("Berhasil!", "Modul berhasil dihapus.");
        fetchProjectModules();
      } else {
        const data = await deleteMasterDataApi(item.id);
        if (data.status !== "success") throw new Error(data.message);
        showSuccessAlert("Berhasil!", "Data master berhasil dihapus.");
        onRefresh();
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Gagal menghapus master data.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-hidden bg-surface-muted flex flex-col w-full h-full text-left">
      <div className="flex flex-1 gap-4 w-full h-full p-4 md:p-5 relative">
        {/* #309 — overlay laci kategori (hanya < md) */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label={t("master.closeCategories", "Tutup kategori")}
            className="fixed inset-0 z-40 bg-overlay/50 md:hidden cursor-pointer"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar for Master Data Types — laci di bawah md */}
        <div
          className={cn(
            "w-[260px] shrink-0 flex flex-col h-full bg-surface border border-border-subtle/80 rounded-lg overflow-hidden shadow-2xs",
            "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:rounded-none max-md:border-y-0 max-md:border-l-0",
            "max-md:transition-transform max-md:duration-200",
            sidebarOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
          )}
        >
          <div className="p-3.5 border-b border-border-faint flex items-center justify-between bg-surface-sunken/50">
            <div>
              <h3 className="font-normal text-content-strong text-xs uppercase tracking-wider">
                {t("master.masterDatabase")}
              </h3>
              <p className="text-xs sm:text-[10px] text-content-subtle mt-0.5">
                {t("master.systemConfiguration")}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-7 h-7 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <Settings className="w-3.5 h-3.5" />
              </div>
              <button
                type="button"
                className="md:hidden p-1.5 rounded-md text-content-muted hover:bg-surface-muted cursor-pointer"
                onClick={() => setSidebarOpen(false)}
                aria-label={t("master.closeCategories", "Tutup kategori")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 py-2 flex flex-col gap-1 px-2.5 overflow-y-auto relative custom-scrollbar">
            {masterDataTypes.map((t) => {
              const count =
                t.type === "modul_aplikasi"
                  ? projectModules.length
                  : masterData.filter((d) => d.type === t.type).length;
              const isActive = selectedType === t.type;
              return (
                <button
                  key={t.type}
                  onClick={() => {
                    setSelectedType(t.type);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-xs transition-all flex items-center justify-between group relative cursor-pointer select-none",
                    isActive
                      ? "bg-indigo-500/10 text-indigo-700 font-medium border-l-3 border-l-indigo-600 shadow-2xs"
                      : "text-content-secondary hover:bg-surface-sunken hover:text-content font-medium"
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        isActive ? "bg-indigo-600" : "bg-surface-marker group-hover:bg-indigo-400"
                      )}
                    />
                    {t.label}
                  </span>
                  <span
                    className={cn(
                      "text-xs sm:text-[10px] font-medium px-2 py-0.5 rounded-md transition-all shrink-0",
                      isActive
                        ? "bg-indigo-500/15 text-indigo-700"
                        : "bg-surface-muted text-content-muted group-hover:bg-surface-strong"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          {/* #309 — pemicu laci di HP/tablet */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden mb-3 flex items-center gap-2 px-3 py-2.5 bg-surface border border-border-subtle/80 rounded-lg text-xs font-medium text-content-strong shadow-2xs cursor-pointer"
          >
            <Menu className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="truncate">
              {masterDataTypes.find((x) => x.type === selectedType)?.label ||
                t("master.openCategories", "Kategori master")}
            </span>
          </button>

          {/* Header */}
          <div className="bg-surface p-4 md:p-5 rounded-lg border border-border-subtle/80 mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 shadow-2xs shrink-0 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] leading-none font-medium text-indigo-600 bg-indigo-500/10 px-2.5 py-[3px] rounded-md border border-indigo-500/30">
                  {t("master.systemMaster")}
                </span>
                <span className="text-xs text-content-subtle font-medium">
                  • {t("master.enterpriseControl")}
                </span>
              </div>
              <h2 className="text-base font-medium text-content-strong tracking-tight">
                {masterDataTypes.find((t) => t.type === selectedType)?.label}
              </h2>
              <p className="text-content-muted text-xs font-medium mt-0.5">
                {selectedType === "modul_aplikasi"
                  ? t("master.moduleHint")
                  : t("master.configHint", {
                      type: masterDataTypes
                        .find((mt) => mt.type === selectedType)
                        ?.label.toLowerCase(),
                    })}
              </p>
            </div>
            {hasPermission(
              userRole as PeranEfektif,
              "configuration",
              "update",
              false,
              currentUserProfile?.permissions
            ) && (
              <button
                onClick={() => {
                  if (selectedType === "modul_aplikasi") {
                    setNewModuleProjectId(projects?.[0]?.id || "");
                    setNewModuleNamaModul("");
                    setNewModuleKeterangan("");
                    setIsNewModuleModalOpen(true);
                  } else {
                    setNewMasterType(selectedType);
                    setNewMasterLabel("");
                    setNewMasterShortCode("");
                    setNewMasterBaseUrl("");
                    setIsNewMasterModalOpen(true);
                  }
                }}
                className="btn-animation waves-effect waves-light btn-primary h-9 px-3 sm:px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs w-full sm:w-auto whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />{" "}
                {t("master.addType", {
                  type: masterDataTypes.find((mt) => mt.type === selectedType)?.label,
                })}
              </button>
            )}
          </div>

          {selectedType === "modul_aplikasi" ? (
            <div className="bg-surface rounded-lg border border-border-subtle/80 shadow-2xs p-4 flex-1 overflow-y-auto custom-scrollbar">
              {loadingModules ? (
                <div className="flex justify-center items-center h-48">
                  <span className="text-xs font-medium text-content-muted animate-pulse">
                    {t("master.loadingModules")}
                  </span>
                </div>
              ) : projectModules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-content-subtle">
                  <Layers className="w-12 h-12 mb-3 text-content-subtle animate-pulse" />
                  <p className="text-xs font-medium text-content-body">{t("master.noModules")}</p>
                  <p className="text-xs mt-1 text-content-subtle">{t("master.noModulesHint")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projectModules.map((mod: any) => {
                    const p = projects?.find((proj) => proj.id === mod.projectId);
                    return (
                      <div
                        key={mod.id}
                        className="flex items-center justify-between p-3 bg-surface border border-border-subtle/80 rounded-lg shadow-2xs hover:border-indigo-500/30 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 font-medium text-xs">
                            MOD
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-content-strong">
                                {mod.namaModul}
                              </span>
                              <span className="text-[10px] leading-none bg-indigo-500/10 text-indigo-700 font-medium px-2 py-[3px] rounded-md border border-indigo-500/30">
                                {p ? p.name : mod.projectId}
                              </span>
                            </div>
                            <p className="text-xs sm:text-[11px] text-content-subtle font-medium mt-0.5">
                              {mod.keterangan || (
                                <span className="text-content-subtle italic">
                                  {t("master.noDescription")}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        {hasPermission(
                          userRole as PeranEfektif,
                          "configuration",
                          "update",
                          false,
                          currentUserProfile?.permissions
                        ) && (
                          <div className="flex gap-1.5 items-center">
                            <button
                              onClick={() => {
                                setEditingModuleId(mod.id);
                                setEditingModuleProjectId(mod.projectId);
                                setEditingModuleNamaModul(mod.namaModul);
                                setEditingModuleKeterangan(mod.keterangan || "");
                                setIsEditModuleModalOpen(true);
                              }}
                              className="w-7 h-7 bg-surface-sunken hover:bg-indigo-500/10 text-content-muted hover:text-indigo-600 border border-border-subtle/60 rounded-md transition-all cursor-pointer font-medium flex items-center justify-center"
                              title={t("master.editModule")}
                            >
                              <Edit className="w-3.5 h-3.5 shrink-0" />
                            </button>
                            <button
                              onClick={() => {
                                deleteMasterData({
                                  id: mod.id,
                                  label: `${mod.namaModul} (Modul)`,
                                  isModule: true,
                                });
                              }}
                              className="w-7 h-7 bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-content-inverse border border-rose-500/30 rounded-md transition-all cursor-pointer font-medium flex items-center justify-center"
                              title={t("master.deleteModule")}
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* TOP SEGMENTED CONTROL / TAB FILTER */}
              {selectedType === "project_role" && (
                <div className="bg-surface p-3 rounded-lg border border-border-subtle/80 mb-3 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                  <div>
                    <span className="text-xs font-medium text-content-body block">
                      {t("master.scopeFilter")}
                    </span>
                    <span className="text-xs sm:text-[10px] text-content-subtle font-medium block">
                      {t("master.scopeFilterHint")}
                    </span>
                  </div>
                  <div className="flex bg-surface-muted p-0.5 rounded-md border border-border-subtle/80 shrink-0 self-start sm:self-auto overflow-x-auto max-w-full">
                    <button
                      type="button"
                      onClick={() => setRoleTabFilter("ALL")}
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5",
                        roleTabFilter === "ALL"
                          ? "bg-surface text-content-strong shadow-2xs font-medium"
                          : "text-content-muted hover:text-content-strong"
                      )}
                    >
                      <span>{t("master.allRoles")}</span>
                      <span
                        className={cn(
                          "text-xs sm:text-[11px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                          roleTabFilter === "ALL"
                            ? "bg-surface-muted text-content-body"
                            : "bg-surface-strong/60 text-content-secondary"
                        )}
                      >
                        {localMasterData.filter((d) => d.type === "project_role").length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleTabFilter("PROJECT")}
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5",
                        roleTabFilter === "PROJECT"
                          ? "bg-surface text-blue-700 shadow-2xs font-medium"
                          : "text-content-muted hover:text-content-strong"
                      )}
                    >
                      <span>{t("master.projectRoles")}</span>
                      <span
                        className={cn(
                          "text-xs sm:text-[11px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                          roleTabFilter === "PROJECT"
                            ? "bg-blue-500/10 text-blue-700"
                            : "bg-surface-strong/60 text-content-secondary"
                        )}
                      >
                        {
                          localMasterData.filter(
                            (d) =>
                              d.type === "project_role" &&
                              (d.roleType === "PROJECT" ||
                                d.role_type === "PROJECT" ||
                                (!d.roleType && !d.role_type))
                          ).length
                        }
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleTabFilter("SYSTEM")}
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5",
                        roleTabFilter === "SYSTEM"
                          ? "bg-surface text-purple-700 shadow-2xs font-medium"
                          : "text-content-muted hover:text-content-strong"
                      )}
                    >
                      <span>{t("master.systemRoles")}</span>
                      <span
                        className={cn(
                          "text-xs sm:text-[11px] sm:text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                          roleTabFilter === "SYSTEM"
                            ? "bg-purple-500/10 text-purple-700"
                            : "bg-surface-strong/60 text-content-secondary"
                        )}
                      >
                        {
                          localMasterData.filter(
                            (d) =>
                              d.type === "project_role" &&
                              (d.roleType === "SYSTEM" || d.role_type === "SYSTEM")
                          ).length
                        }
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-surface rounded-lg border border-border-subtle/80 shadow-2xs p-3.5 flex-1 overflow-y-auto custom-scrollbar">
                <DragDropContext
                  onDragEnd={async (result) => {
                    if (!result.destination) return;
                    const currentList = localMasterData
                      .filter((d) => {
                        if (d.type !== selectedType) return false;
                        if (selectedType === "project_role") {
                          if (roleTabFilter === "PROJECT") {
                            return (
                              d.roleType === "PROJECT" ||
                              d.role_type === "PROJECT" ||
                              (!d.roleType && !d.role_type)
                            );
                          }
                          if (roleTabFilter === "SYSTEM") {
                            return d.roleType === "SYSTEM" || d.role_type === "SYSTEM";
                          }
                        }
                        return true;
                      })
                      .sort((a, b) => (a.order || 0) - (b.order || 0));
                    const [reorderedItem] = currentList.splice(result.source.index, 1);
                    currentList.splice(result.destination.index, 0, reorderedItem);

                    const updatedAll = localMasterData.map((item) => {
                      if (item.type !== selectedType) return item;
                      const foundIdx = currentList.findIndex((c) => c.id === item.id);
                      if (foundIdx !== -1) {
                        return { ...item, order: foundIdx };
                      }
                      return item;
                    });
                    setLocalMasterData(updatedAll);

                    try {
                      await reorderMasterData(currentList);
                      onRefresh();
                      toast.success(t("toast.orderUpdated"));
                    } catch (error) {
                      console.error("Reorder error", error);
                      toast.error(t("toast.orderSaveFailed"));
                      setLocalMasterData(masterData);
                    }
                  }}
                >
                  <Droppable droppableId={`master-${selectedType}`}>
                    {(provided: any, snapshot: any) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={cn(
                          "space-y-2 min-h-[300px] transition-colors p-1",
                          snapshot.isDraggingOver ? "bg-indigo-500/10 rounded-lg" : ""
                        )}
                      >
                        {localMasterData
                          .filter((d) => {
                            if (d.type !== selectedType) return false;
                            if (selectedType === "project_role") {
                              if (roleTabFilter === "PROJECT") {
                                return (
                                  d.roleType === "PROJECT" ||
                                  d.role_type === "PROJECT" ||
                                  (!d.roleType && !d.role_type)
                                );
                              }
                              if (roleTabFilter === "SYSTEM") {
                                return d.roleType === "SYSTEM" || d.role_type === "SYSTEM";
                              }
                            }
                            return true;
                          })
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map((item, index) => {
                            const usageCount = getUsageCount(item);
                            return (
                              <Draggable key={item.id} draggableId={item.id} index={index}>
                                {(provided: any, snapshot: any) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={cn(
                                      "flex justify-between items-center p-3 bg-surface border border-border-subtle/80 rounded-lg transition-all group hover:border-indigo-500/30 shadow-2xs",
                                      snapshot.isDragging
                                        ? "shadow-soft-lg border-indigo-500 bg-indigo-500/10 cursor-grabbing z-50"
                                        : ""
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="text-content-subtle group-hover:text-content-muted transition-colors cursor-grab active:cursor-grabbing p-1">
                                        <GripVertical className="w-4 h-4" />
                                      </div>

                                      {item.icon ? (
                                        <div
                                          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 border border-border-faint shadow-2xs"
                                          style={{
                                            backgroundColor: (item.color || "#3b82f6") + "15",
                                            color: item.color || "#3b82f6",
                                          }}
                                        >
                                          <RenderIcon iconName={item.icon} className="w-4 h-4" />
                                        </div>
                                      ) : (
                                        <div
                                          className="w-4 h-4 rounded-full shrink-0 shadow-2xs border border-black/10"
                                          style={{ backgroundColor: item.color || "#ccc" }}
                                        />
                                      )}

                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs font-medium text-content-strong">
                                            {item.label}
                                          </span>

                                          {selectedType === "project_role" &&
                                            (() => {
                                              const rType =
                                                item.roleType || item.role_type || "PROJECT";
                                              const isSystemReserved =
                                                item.is_system_default ||
                                                [
                                                  "admin",
                                                  "member",
                                                  "viewer",
                                                  "developer",
                                                  "ui/ux",
                                                  "qa",
                                                  "dba",
                                                  "arsitektur",
                                                  "system analyst",
                                                  "bisnis analyst",
                                                ].some((def) =>
                                                  (item.label || "").toLowerCase().includes(def)
                                                );
                                              return (
                                                <div className="flex items-center gap-1 shrink-0 select-none">
                                                  {rType === "PROJECT" ? (
                                                    <span className="text-[10px] leading-none sm:text-[9px] font-medium px-2 py-0.2 rounded-md bg-blue-500/10 text-blue-700 border border-blue-500/30 uppercase">
                                                      {t("master.projectRole")}
                                                    </span>
                                                  ) : (
                                                    <span className="text-[10px] leading-none sm:text-[9px] font-medium px-2 py-0.2 rounded-md bg-purple-500/10 text-purple-700 border border-purple-500/30 uppercase">
                                                      {t("master.systemRole")}
                                                    </span>
                                                  )}
                                                  {isSystemReserved && (
                                                    <span
                                                      className="text-xs"
                                                      title={t("master.reservedSystemRole")}
                                                      role="img"
                                                      aria-label="lock"
                                                    >
                                                      🔒
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })()}

                                          {usageCount > 0 && (
                                            <span className="text-[10px] leading-none font-medium px-2 py-0.2 rounded-md bg-indigo-500/10 text-indigo-700 border border-indigo-500/30 flex items-center gap-1">
                                              <Tag className="w-3 h-3" />{" "}
                                              {t("rakit.activeTasks", { count: usageCount })}
                                            </span>
                                          )}
                                        </div>
                                        {item.description && (
                                          <span className="text-xs sm:text-[11px] text-content-subtle font-medium mt-0.5">
                                            {item.description}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {hasPermission(
                                        userRole as PeranEfektif,
                                        "configuration",
                                        "update",
                                        false,
                                        currentUserProfile?.permissions
                                      ) && (
                                        <div className="flex gap-1.5 items-center">
                                          <button
                                            onClick={() => {
                                              setEditingMaster(item);
                                              setIsEditMasterModalOpen(true);
                                            }}
                                            className="w-7 h-7 bg-surface-sunken hover:bg-indigo-500/10 text-content-muted hover:text-indigo-600 border border-border-subtle/60 rounded-md transition-all cursor-pointer font-medium flex items-center justify-center"
                                            title={t("master.editMasterData")}
                                          >
                                            <Edit className="w-3.5 h-3.5 shrink-0" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              deleteMasterData({
                                                id: item.id,
                                                label: item.label,
                                                isModule: false,
                                              })
                                            }
                                            className="w-7 h-7 bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-content-inverse border border-rose-500/30 rounded-md transition-all cursor-pointer font-medium flex items-center justify-center"
                                            title={t("master.deleteMasterData")}
                                          >
                                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah Master Data (Dynamic Contextual) */}
      <Modal
        isOpen={isNewMasterModalOpen}
        onClose={() => {
          setIsNewMasterModalOpen(false);
          setIconSearch("");
        }}
        title={t("master.tambahJenis", {
          jenis: masterDataTypes.find((x) => x.type === selectedType)?.label ?? "",
        })}
        maxWidth="max-w-xl"
      >
        <div className="space-y-6">
          {/* Live Preview Badge Component */}
          <div className="p-4 bg-surface-inverse-strong text-content-inverse rounded-xl flex items-center justify-between shadow-soft-lg border border-border-inverse">
            <div className="flex items-center gap-3.5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center bg-surface/10 shadow-inner"
                style={{ color: newMasterColor }}
              >
                <RenderIcon iconName={newMasterIcon} className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-medium text-content-inverse">
                  {newMasterLabel || t("master.labelMasterData")}
                </span>
                {selectedType === "project_role" && (
                  <span className="text-xs sm:text-[11px] sm:text-[9px] font-normal uppercase tracking-widest text-indigo-400 mt-0.5">
                    {newMasterRoleType === "PROJECT"
                      ? "Project Role (Tim Proyek)"
                      : "System Role (Akses Platform)"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {selectedType === "project_role" && (
            <div className="space-y-2">
              <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest ml-1">
                {t("master.roleTypeScope")}
              </label>
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-surface-muted rounded-xl border border-border-subtle">
                <button
                  type="button"
                  onClick={() => setNewMasterRoleType("PROJECT")}
                  className={cn(
                    "py-2.5 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer",
                    newMasterRoleType === "PROJECT"
                      ? "bg-surface text-indigo-600 shadow-soft border border-border-subtle/60"
                      : "text-content-secondary hover:text-content"
                  )}
                >
                  <span>{t("master.projectRole")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewMasterRoleType("SYSTEM")}
                  className={cn(
                    "py-2.5 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer",
                    newMasterRoleType === "SYSTEM"
                      ? "bg-surface text-indigo-600 shadow-soft border border-border-subtle/60"
                      : "text-content-secondary hover:text-content"
                  )}
                >
                  <span>{t("master.systemRole")}</span>
                </button>
              </div>
              <p className="text-xs sm:text-[10px] text-content-muted font-medium ml-1">
                {newMasterRoleType === "PROJECT"
                  ? "Peran anggota dalam tim proyek (cth: BA, Lead, QA, Developer)"
                  : "Hak akses global level aplikasi (cth: Administrator, Auditor, Guest)"}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest mb-1.5 ml-1">
                {t("master.labelName")}
              </label>
              <Input
                value={newMasterLabel}
                onChange={(e: any) => setNewMasterLabel(e.target.value)}
                placeholder={
                  selectedType === "project_role"
                    ? "cth: Business Analyst, Project Lead, QA Specialist, Senior Developer"
                    : "misal: Critical, Done, Staging"
                }
                className="!bg-surface border-border-subtle"
              />
            </div>

            {/* Dynamic Contextual Fields */}
            {selectedType === "priority" && (
              <div>
                <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest mb-1.5 ml-1">
                  {t("master.shortCode")}
                </label>
                <Input
                  value={newMasterShortCode}
                  onChange={(e: any) => setNewMasterShortCode(e.target.value)}
                  placeholder={t("master.shortCodePlaceholder")}
                  className="!bg-surface border-border-subtle"
                />
              </div>
            )}

            {selectedType === "issue_type" && (
              <div>
                <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest mb-1.5 ml-1">
                  {t("master.hierarchyLevel")}
                </label>
                <StyledDropdown
                  value={newMasterHierarchy}
                  onChange={setNewMasterHierarchy}
                  options={[
                    { id: "Epic", label: "Epic" },
                    { id: "Standard", label: "Standard" },
                    { id: "Subtask", label: "Subtask" },
                  ]}
                  buttonClassName="w-full px-4 py-3 bg-surface border border-border-subtle rounded-xl text-sm text-left font-normal text-content-strong"
                />
              </div>
            )}

            {selectedType === "status" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest mb-1.5 ml-1">
                    {t("master.statusGroup")}
                  </label>
                  <StyledDropdown
                    value={newMasterStatusGroup}
                    onChange={(val) => {
                      setNewMasterStatusGroup(val);
                      if (val === "Done") setNewMasterIsTerminal(true);
                    }}
                    options={[
                      { id: "To Do", label: "To Do" },
                      { id: "In Progress", label: "In Progress" },
                      { id: "Done", label: "Done" },
                    ]}
                    buttonClassName="w-full px-4 py-3 bg-surface border border-border-subtle rounded-xl text-sm text-left font-normal text-content-strong"
                  />
                </div>
                <label className="flex items-center gap-2 ml-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMasterIsTerminal}
                    onChange={(e) => setNewMasterIsTerminal(e.target.checked)}
                    className="rounded border-border-subtle"
                  />
                  <span className="text-sm text-content-body">{t("master.isTerminal")}</span>
                </label>
              </div>
            )}

            {selectedType === "environment" && (
              <div>
                <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest mb-1.5 ml-1">
                  {t("master.endpointBaseUrl")}
                </label>
                <Input
                  value={newMasterBaseUrl}
                  onChange={(e: any) => setNewMasterBaseUrl(e.target.value)}
                  placeholder={t("master.endpointPlaceholder")}
                  className="!bg-surface border-border-subtle"
                />
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest mb-1.5 ml-1">
                {t("master.colorAccent")}
              </label>
              <div className="flex gap-2">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-border-subtle shadow-soft shrink-0 bg-surface flex items-center justify-center">
                  <input
                    type="color"
                    value={newMasterColor}
                    onChange={(e: any) => setNewMasterColor(e.target.value)}
                    className="absolute inset-x-0 inset-y-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <div
                    className="w-6 h-6 rounded-md pointer-events-none shadow-soft"
                    style={{ backgroundColor: newMasterColor }}
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={newMasterColor}
                    onChange={(e: any) => {
                      const val = e.target.value;
                      if (val.startsWith("#") && val.length <= 7) {
                        setNewMasterColor(val);
                      } else if (!val.startsWith("#") && val.length <= 6) {
                        setNewMasterColor("#" + val);
                      }
                    }}
                    className="w-full h-12 px-3 bg-surface border border-border-subtle rounded-xl text-xs font-mono font-medium text-content-body outline-none focus:border-indigo-500 transition-all uppercase"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest mb-1.5 ml-1">
              {t("master.colorPalette")}
            </label>
            <div className="flex flex-wrap gap-2 p-2.5 bg-surface-sunken border border-border-subtle rounded-xl">
              {[
                { hex: "#ef4444", label: t("master.colorRed") },
                { hex: "#f97316", label: t("master.colorOrange") },
                { hex: "#eab308", label: t("master.colorYellow") },
                { hex: "#22c55e", label: t("master.colorGreen") },
                { hex: "#06b6d4", label: t("master.colorCyan") },
                { hex: "#3b82f6", label: t("master.colorBlue") },
                { hex: "#6366f1", label: t("master.colorIndigo") },
                { hex: "#a855f7", label: t("master.colorPurple") },
                { hex: "#ec4899", label: t("master.colorPink") },
                { hex: "#64748b", label: t("master.colorSlate") },
                { hex: "#0f172a", label: t("master.colorDark") },
              ].map((p) => (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => setNewMasterColor(p.hex)}
                  className={cn(
                    "w-6 h-6 rounded-full border border-black/10 transition-transform active:scale-95 duration-100 hover:scale-110",
                    newMasterColor.toLowerCase() === p.hex.toLowerCase()
                      ? "ring-2 ring-offset-2 ring-indigo-500 scale-110"
                      : "hover:border-slate-400"
                  )}
                  style={{ backgroundColor: p.hex }}
                  title={p.label}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 ml-1">
              <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest">
                {t("master.pickIcon", { count: filteredNewIcons.length })}
              </label>
            </div>

            <div className="relative mb-2">
              <input
                type="text"
                placeholder={t("master.searchIcon")}
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                className="w-full px-10 py-2.5 bg-surface border border-border-subtle rounded-xl text-xs font-normal text-content-body placeholder:text-content-subtle focus:outline-none focus:border-indigo-500 transition-all pl-10"
              />
              <Search className="w-4 h-4 text-content-subtle absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="grid grid-cols-8 md:grid-cols-10 gap-1.5 p-2.5 border border-border-subtle rounded-xl bg-surface-sunken max-h-52 overflow-y-auto custom-scrollbar">
              {filteredNewIcons.length > 0 ? (
                filteredNewIcons.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setNewMasterIcon(i.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-lg transition-all",
                      newMasterIcon === i.id
                        ? "bg-indigo-600 text-content-inverse shadow-md scale-105"
                        : "hover:bg-surface text-content-muted hover:text-content-strong"
                    )}
                    title={i.label}
                  >
                    <RenderIcon iconName={i.id} className="w-5 h-5" />
                  </button>
                ))
              ) : (
                <div className="col-span-full py-6 text-center text-xs text-content-subtle font-medium">
                  {t("master.noIconMatchesTheKeyword")}
                  {iconSearch}"
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsNewMasterModalOpen(false);
                setIconSearch("");
              }}
              className="flex-1 justify-center py-3"
            >
              {t("master.cancel")}
            </Button>
            <Button
              onClick={handleCreateMasterData}
              disabled={isSaving}
              className="flex-1 justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-content-inverse font-medium"
            >
              {isSaving ? t("master.saving") : t("master.saveMasterData")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Edit Master Data */}
      <Modal
        isOpen={isEditMasterModalOpen}
        onClose={() => {
          setIsEditMasterModalOpen(false);
          setEditIconSearch("");
        }}
        title={t("master.editMasterData")}
        maxWidth="max-w-xl"
      >
        {editingMaster && (
          <div className="space-y-6">
            {/* Live Preview Badge */}
            <div className="p-4 bg-surface-inverse-strong text-content-inverse rounded-xl flex items-center justify-between shadow-soft-lg border border-border-inverse">
              <div className="flex items-center gap-3.5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center bg-surface/10 shadow-inner"
                  style={{ color: editingMaster.color || "#3b82f6" }}
                >
                  <RenderIcon iconName={editingMaster.icon || "CircleDot"} className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-base font-medium text-content-inverse">
                    {editingMaster.label || t("master.labelMasterData")}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest mb-1.5 ml-1">
                  {t("master.labelName")}
                </label>
                <Input
                  value={editingMaster.label}
                  onChange={(e: any) =>
                    setEditingMaster({ ...editingMaster, label: e.target.value })
                  }
                  className="!bg-surface border-border-subtle"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest mb-1.5 ml-1">
                  {t("master.colorAccent")}
                </label>
                <div className="flex gap-2">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-border-subtle shadow-soft shrink-0 bg-surface flex items-center justify-center">
                    <input
                      type="color"
                      value={editingMaster.color || "#000000"}
                      onChange={(e: any) =>
                        setEditingMaster({ ...editingMaster, color: e.target.value })
                      }
                      className="absolute inset-x-0 inset-y-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <div
                      className="w-6 h-6 rounded-md pointer-events-none shadow-soft"
                      style={{ backgroundColor: editingMaster.color || "#000000" }}
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={editingMaster.color || ""}
                      onChange={(e: any) => {
                        const val = e.target.value;
                        if (val.startsWith("#") && val.length <= 7) {
                          setEditingMaster({ ...editingMaster, color: val });
                        } else if (!val.startsWith("#") && val.length <= 6) {
                          setEditingMaster({ ...editingMaster, color: "#" + val });
                        }
                      }}
                      className="w-full h-12 px-3 bg-surface border border-border-subtle rounded-xl text-xs font-mono font-medium text-content-body outline-none focus:border-indigo-500 transition-all uppercase"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest mb-1.5 ml-1">
                {t("master.colorPalette")}
              </label>
              <div className="flex flex-wrap gap-2 p-2.5 bg-surface-sunken border border-border-subtle rounded-xl">
                {[
                  { hex: "#ef4444", label: t("master.colorRed") },
                  { hex: "#f97316", label: t("master.colorOrange") },
                  { hex: "#eab308", label: t("master.colorYellow") },
                  { hex: "#22c55e", label: t("master.colorGreen") },
                  { hex: "#06b6d4", label: t("master.colorCyan") },
                  { hex: "#3b82f6", label: t("master.colorBlue") },
                  { hex: "#6366f1", label: t("master.colorIndigo") },
                  { hex: "#a855f7", label: t("master.colorPurple") },
                  { hex: "#ec4899", label: t("master.colorPink") },
                  { hex: "#64748b", label: t("master.colorSlate") },
                  { hex: "#0f172a", label: t("master.colorDark") },
                ].map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setEditingMaster({ ...editingMaster, color: p.hex })}
                    className={cn(
                      "w-6 h-6 rounded-full border border-black/10 transition-transform active:scale-95 duration-100 hover:scale-110",
                      (editingMaster.color || "").toLowerCase() === p.hex.toLowerCase()
                        ? "ring-2 ring-offset-2 ring-indigo-500 scale-110"
                        : "hover:border-slate-400"
                    )}
                    style={{ backgroundColor: p.hex }}
                    title={p.label}
                  />
                ))}
              </div>
            </div>

            {editingMaster.type === "status" && (
              <label className="flex items-center gap-2 ml-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!editingMaster.isTerminal}
                  onChange={(e) =>
                    setEditingMaster({ ...editingMaster, isTerminal: e.target.checked })
                  }
                  className="rounded border-border-subtle"
                />
                <span className="text-sm text-content-body">{t("master.isTerminal")}</span>
              </label>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest">
                  Ikon ({filteredEditIcons.length} tersedia)
                </label>
              </div>

              <div className="relative mb-2">
                <input
                  type="text"
                  placeholder={t("master.searchIcon")}
                  value={editIconSearch}
                  onChange={(e) => setEditIconSearch(e.target.value)}
                  className="w-full px-10 py-2.5 bg-surface border border-border-subtle rounded-xl text-xs font-normal text-content-body placeholder:text-content-subtle focus:outline-none focus:border-indigo-500 transition-all pl-10"
                />
                <Search className="w-4 h-4 text-content-subtle absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>

              <div className="grid grid-cols-8 md:grid-cols-10 gap-1.5 p-2.5 border border-border-subtle rounded-xl bg-surface-sunken max-h-52 overflow-y-auto custom-scrollbar">
                {filteredEditIcons.length > 0 ? (
                  filteredEditIcons.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setEditingMaster({ ...editingMaster, icon: i.id })}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-lg transition-all",
                        editingMaster.icon === i.id
                          ? "bg-indigo-600 text-content-inverse shadow-md scale-105"
                          : "hover:bg-surface text-content-muted hover:text-content-strong"
                      )}
                      title={i.label}
                    >
                      <RenderIcon iconName={i.id} className="w-5 h-5" />
                    </button>
                  ))
                ) : (
                  <div className="col-span-full py-6 text-center text-xs text-content-subtle font-medium">
                    {t("master.noIconMatchesTheKeyword")}
                    {editIconSearch}"
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditMasterModalOpen(false);
                  setEditIconSearch("");
                }}
                className="flex-1 justify-center py-3"
              >
                {t("master.cancel")}
              </Button>
              <Button
                onClick={handleUpdateMasterData}
                disabled={isSaving}
                className="flex-1 justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-content-inverse font-medium"
              >
                {isSaving ? t("common.saving") : t("common.saveChanges2")}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Tambah Modul Baru */}
      <Modal
        isOpen={isNewModuleModalOpen}
        onClose={() => setIsNewModuleModalOpen(false)}
        title={t("master.addModuleTitle")}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest mb-1.5 ml-1">
              {t("master.projectName")}
            </label>
            <StyledDropdown
              value={newModuleProjectId}
              onChange={setNewModuleProjectId}
              options={[
                { id: "", label: t("master.selectProject") },
                ...projects.map((p: any) => ({ id: p.id, label: p.name })),
              ]}
              buttonClassName="w-full px-4 py-3 bg-surface-sunken border border-border-subtle rounded-xl text-sm text-left font-normal text-content-strong"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest mb-1.5 ml-1">
              {t("master.moduleName")}
            </label>
            <Input
              value={newModuleNamaModul}
              onChange={(e: any) => setNewModuleNamaModul(e.target.value)}
              placeholder={t("master.moduleNamePlaceholder")}
              className="!bg-surface border-border-subtle"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest mb-1.5 ml-1">
              {t("master.remarks")}
            </label>
            <textarea
              value={newModuleKeterangan}
              onChange={(e) => setNewModuleKeterangan(e.target.value)}
              placeholder={t("master.remarksPlaceholder")}
              rows={3}
              className="w-full px-4 py-3 bg-surface border border-border-subtle rounded-xl text-sm font-normal text-content-strong placeholder:text-content-subtle outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsNewModuleModalOpen(false)}
              className="flex-1 justify-center py-3"
            >
              {t("master.cancel")}
            </Button>
            <Button
              onClick={handleCreateModule}
              disabled={isSaving}
              className="flex-1 justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-content-inverse font-medium"
            >
              {isSaving ? t("common.saving") : t("master.addModule")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Edit Modul */}
      <Modal
        isOpen={isEditModuleModalOpen}
        onClose={() => setIsEditModuleModalOpen(false)}
        title={t("master.editModuleApp")}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest mb-1.5 ml-1">
              {t("master.projectName")}
            </label>
            <StyledDropdown
              value={editingModuleProjectId}
              onChange={setEditingModuleProjectId}
              options={[
                { id: "", label: t("master.pickProject") },
                ...projects.map((p: any) => ({ id: p.id, label: p.name })),
              ]}
              buttonClassName="w-full px-4 py-3 bg-surface-sunken border border-border-subtle rounded-xl text-sm text-left font-normal text-content-strong"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest mb-1.5 ml-1">
              {t("master.moduleName")}
            </label>
            <Input
              value={editingModuleNamaModul}
              onChange={(e: any) => setEditingModuleNamaModul(e.target.value)}
              placeholder={t("master.moduleNamePlaceholder")}
              className="!bg-surface border-border-subtle"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-[10px] font-normal text-content-subtle uppercase tracking-widest mb-1.5 ml-1">
              {t("master.remarks")}
            </label>
            <textarea
              value={editingModuleKeterangan}
              onChange={(e) => setEditingModuleKeterangan(e.target.value)}
              placeholder={t("master.remarksPlaceholder")}
              rows={3}
              className="w-full px-4 py-3 bg-surface border border-border-subtle rounded-xl text-sm font-normal text-content-strong placeholder:text-content-subtle outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditModuleModalOpen(false)}
              className="flex-1 justify-center py-3"
            >
              {t("master.cancel")}
            </Button>
            <Button
              onClick={handleUpdateModule}
              disabled={isSaving}
              className="flex-1 justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-content-inverse font-medium"
            >
              {isSaving ? t("common.saving") : t("common.saveChanges2")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
