import { useTranslation } from "react-i18next";
import { safeLocalStorage } from "../../lib/safeStorage";
import React, { useState, useEffect } from "react";
import { UserProfile, Project, Task, AppRole, UserPermissions } from "../../types";
import { UserAvatar } from "./styles";
import {
  ArrowLeft,
  ShieldCheck,
  Award,
  UserCog,
  Users,
  Eye,
  CheckCircle,
  Layout,
  Mail,
  Phone,
  Key,
  Check,
  Clock,
  Building,
  Lock,
  ShieldAlert,
  Trash2,
  Plus,
  UserPlus,
  Save,
  RefreshCw,
  Server,
  RotateCcw,
} from "lucide-react";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { cn } from "../../lib/utils";
import {
  katalogPeranSistem,
  katalogPeranProyek,
  labelPeran,
  cariPeran,
} from "../../lib/roleCatalog";
import { toast } from "sonner";
import {
  updateUser,
  uploadAvatar,
  fetchUsers,
  assignUserToProject,
  removeUserFromProject,
} from "./services/users.service";
import {
  DEFAULT_PERMISSIONS as ROLE_DEFAULT_PERMISSIONS,
  getUserPermissions,
} from "../../lib/permissions";

interface UserDetailViewProps {
  user: UserProfile | null;
  onBack: () => void;
  projects: Project[];
  tasks: Task[];
  departments?: any[];
  positions?: any[];
  masterData?: any[];
  onUserUpdated?: () => void;
  currentUser?: UserProfile | null;
}

const MODULE_DESCRIPTIONS: Record<string, { label: string; desc: string }> = {
  dashboard: {
    label: "Dashboard Executive",
    desc: "Akses ke executive KPI summary & analytics widget",
  },
  meetingNotes: {
    label: "Notulensi Rapat (Notes)",
    desc: "Membuat & mengelola catatan rapat serta AI Companion",
  },
  wiki: { label: "Wiki & Dokumentasi", desc: "Dokumentasi internal, SOP, dan pengetahuan tim" },
  list: {
    label: "Pengelolaan Issue / Tugas",
    desc: "Daftar tugas, pembuatan issue, dan pelacakan status",
  },
  sprints: {
    label: "Sprint & Planning",
    desc: "Sprint planning, backlog management, dan alokasi tugas",
  },
  board: {
    label: "Papan Kanban",
    desc: "Visualisasi alur kerja papan Kanban dan drag & drop task",
  },
  qa: {
    label: "Pengujian QA & Test Case",
    desc: "Membuat test suite, test case, dan melacak hasil pengujian",
  },
  timeline: { label: "Roadmap & Timeline", desc: "Visualisasi linimasa proyek dan milestone" },
  access: { label: "Akses Tim & Proyek", desc: "Manajemen anggota tim dan delegasi proyek" },
  userManagement: {
    label: "Manajemen Pengguna System",
    desc: "Mengelola profil user, role, dan clearance status",
  },
  masterData: {
    label: "Master Data Setup",
    desc: "Konfigurasi master data departemen, jabatan, dan role",
  },
  auditLog: { label: "Log Audit Sistem", desc: "Riwayat aktivitas user dan catatan keamanan" },
  dbExplorer: { label: "Database Explorer", desc: "Inspeksi tabel dan query database" },
  settings: {
    label: "Konfigurasi Sistem",
    desc: "Pengaturan Email SMTP, WhatsApp Gateway, & Template",
  },
  flowchart: { label: "Diagram & Flowchart", desc: "Pembuatan diagram proses dan flowchart kerja" },
};

const ROLE_DESCRIPTIONS: Record<string, { label: string; desc: string; icon: React.ReactNode }> = {
  admin: {
    label: "Administrator (Super User)",
    desc: "Memiliki akses penuh ke seluruh modul sistem, master data, serta konfigurasi server.",
    icon: <ShieldCheck className="w-4 h-4 text-rose-600" />,
  },
  head: {
    label: "Department Head",
    desc: "Wewenang supervisi departemen, persetujuan modul rapat & dokumentasi.",
    icon: <Award className="w-4 h-4 text-purple-600" />,
  },
  manager: {
    label: "Project Manager",
    desc: "Pengelolaan penuh pada proyek, tugas, sprint, kanban, dan pengujian QA.",
    icon: <UserCog className="w-4 h-4 text-blue-600" />,
  },
  user: {
    label: "Standard User (Anggota Tim)",
    desc: "Akses membuat & memperbarui tugas, notulensi rapat, serta catatan AI.",
    icon: <Users className="w-4 h-4 text-indigo-600" />,
  },
  viewer: {
    label: "Observer (Read-Only)",
    desc: "Akses hanya melihat data (read-only) tanpa hak mengubah atau membuat data.",
    icon: <Eye className="w-4 h-4 text-content-muted" />,
  },
};

export const UserDetailView: React.FC<UserDetailViewProps> = ({
  user,
  onBack,
  projects = [],
  tasks = [],
  departments = [],
  positions = [],
  masterData = [],
  onUserUpdated,
  currentUser,
}) => {
  const { t } = useTranslation();
  const effectiveCurrentUser =
    currentUser ||
    (() => {
      try {
        const stored = safeLocalStorage.getItem("lanpro_user");
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    })();
  const userRoleStr = effectiveCurrentUser?.role || effectiveCurrentUser?.system_role || "user";
  const isAdmin =
    ["sadm", "admn", "admin", "system admin", "super admin"].includes(
      String(userRoleStr).toLowerCase()
    ) || ["SADM", "ADMN"].includes(userRoleStr);
  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-sunken">
        <h2 className="text-xl font-medium text-content-strong mb-2">{t("userDetail.notFound")}</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-indigo-600 text-content-inverse rounded-md text-xs font-medium"
        >
          {t("userDetail.back")}
        </button>
      </div>
    );
  }

  // Form Edit State
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [photoURL, setPhotoURL] = useState(
    user?.avatar_url || user?.photoURL || user?.avatarUrl || ""
  );
  const [editRole, setEditRole] = useState<AppRole>(user.role || "user");
  const [editStatus, setEditStatus] = useState<"approved" | "pending" | "rejected">(
    user.status || "approved"
  );
  const [editDepartment, setEditDepartment] = useState<string>(user.department || "");
  const [editPosition, setEditPosition] = useState<string>(user.position || "");
  const [editFullName, setEditFullName] = useState<string>(user.displayName || user.username || "");
  const [editEmail, setEditEmail] = useState<string>(user.email || "");
  const [editPhone, setEditPhone] = useState<string>(user.phone || "");
  const [editPassword, setEditPassword] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Clean up object URL on unmount or previewUrl change to avoid memory leak
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // System Permissions Matrix State
  const [editPermissions, setEditPermissions] = useState<UserPermissions>(() => {
    return getUserPermissions(user.role || "user", user.permissions);
  });

  // Project Delegation State
  const [selectedAssignProjectId, setSelectedAssignProjectId] = useState<string>("");
  const [selectedAssignProjectRole, setSelectedAssignProjectRole] = useState<string>("member");
  const [selectedSubordinateIds, setSelectedSubordinateIds] = useState<string[]>([]);

  // #82 — daftar peran dibaca dari Master Data, bukan ditulis di JSX.
  const peranSistem = React.useMemo(() => katalogPeranSistem(masterData), [masterData]);
  const peranProyek = React.useMemo(() => katalogPeranProyek(masterData), [masterData]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [userProjectsList, setUserProjectsList] = useState<Project[]>([]);

  // Fetch users for Sub-Team / PIC subordinate selection
  useEffect(() => {
    fetchUsers()
      .then((data) => {
        if (data) {
          setAvailableUsers(Array.isArray(data) ? data : data.data || []);
        }
      })
      .catch(() => {});
  }, []);

  // Sync state when user changes
  useEffect(() => {
    if (user) {
      setPhotoURL(user.avatar_url || user.photoURL || user.avatarUrl || "");
      setSelectedAvatar(null);
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setEditRole(user.role || "user");
      setEditStatus(user.status || "approved");
      setEditDepartment(user.department || "");
      setEditPosition(user.position || "");
      setEditFullName(user.displayName || user.username || "");
      setEditEmail(user.email || "");
      setEditPhone(user.phone || "");
      setEditPassword("");
      setEditPermissions(getUserPermissions(user.role || "user", user.permissions));
    }
  }, [user]);

  // Compute user projects
  useEffect(() => {
    const list = (projects || []).filter(
      (p) =>
        (p.members && (p.members.includes(user.id) || p.members.includes(user.uid))) ||
        (p.memberRoles && (p.memberRoles[user.id] || p.memberRoles[user.uid])) ||
        p.ownerId === user.id ||
        p.ownerId === user.uid
    );
    setUserProjectsList(list);
  }, [projects, user]);

  const userTasks = (tasks || []).filter(
    (t) =>
      t.assigneeId === user.id ||
      t.assigneeId === user.uid ||
      (t.assignees && (t.assignees.includes(user.id) || t.assignees.includes(user.uid))) ||
      t.assigneeEmail === user?.email
  );

  const getDeptName = (deptId?: string) => {
    const allDepts =
      departments.length > 0 ? departments : masterData.filter((d) => d.type === "department");
    const found = allDepts.find((d: any) => (d.id || d.code) === deptId || d.label === deptId);
    return found?.name || found?.label || deptId || "Umum";
  };

  const getPosName = (posId?: string) => {
    const allPos =
      positions.length > 0
        ? positions
        : masterData.filter((d) => d.type === "jabatan" || d.type === "position");
    const found = allPos.find((p: any) => (p.id || p.code) === posId || p.label === posId);
    return found?.name || found?.label || posId || "Anggota Tim";
  };

  const handleTogglePermission = (
    module: keyof UserPermissions,
    action: "read" | "create" | "update" | "delete"
  ) => {
    setEditPermissions((prev) => {
      const currentModule = prev[module] || {
        read: false,
        create: false,
        update: false,
        delete: false,
      };
      return {
        ...prev,
        [module]: {
          ...currentModule,
          [action]: !currentModule[action],
        },
      };
    });
  };

  const handleResetToRoleDefaults = () => {
    const defaultPerms =
      ROLE_DEFAULT_PERMISSIONS[editRole] ||
      ROLE_DEFAULT_PERMISSIONS.member ||
      ROLE_DEFAULT_PERMISSIONS.viewer ||
      (ROLE_DEFAULT_PERMISSIONS.owner as UserPermissions);
    setEditPermissions(defaultPerms);
    toast.success(`Matrix hak akses di-reset ke default role "${editRole}".`);
  };

  // Handler Input File (Local Preview Only - Deferred Upload)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format file tidak didukung (gunakan JPG, PNG, atau WEBP)");
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }

    // Memory cleanup for previous object URL
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    // Create local object URL for preview without API call
    const objectUrl = URL.createObjectURL(file);
    setSelectedAvatar(file);
    setPreviewUrl(objectUrl);
  };

  // Handler Submit Utama (Simpan Perubahan User)
  const handleSaveUser = async () => {
    if (!editFullName.trim()) {
      toast.error("Nama Lengkap wajib diisi.");
      return;
    }

    setIsSaving(true);
    try {
      let finalPhotoURL = photoURL;

      // Deferred avatar upload if user selected a new file
      if (selectedAvatar) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", selectedAvatar);

        const userId = user.id || user.uid;
        const uploadData = await uploadAvatar(userId, formData);

        if (uploadData && (uploadData.status === "success" || uploadData.avatar_url)) {
          finalPhotoURL =
            uploadData.avatar_url ||
            uploadData.data?.avatar_url ||
            uploadData.data?.photoURL ||
            finalPhotoURL;
          setPhotoURL(finalPhotoURL);
          if (previewUrl && previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(previewUrl);
          }
          setPreviewUrl(null);
          setSelectedAvatar(null);
        } else {
          toast.error(uploadData?.message || "Gagal mengunggah foto avatar.");
          setIsSaving(false);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      const payload: any = {
        displayName: editFullName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        photoURL: finalPhotoURL,
        avatar_url: finalPhotoURL,
        avatarUrl: finalPhotoURL,
      };

      if (isAdmin) {
        payload.role = editRole;
        payload.status = editStatus;
        payload.department = editDepartment;
        payload.position = editPosition;
        payload.permissions = editPermissions;
      }

      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await updateUser(user.id || user.uid, payload);

      if (res.status === "success" || res.data) {
        toast.success(`Data & Hak Akses Pengguna ${editFullName} Berhasil Diperbarui!`);
        if (onUserUpdated) onUserUpdated();
      } else {
        toast.error(res.message || "Gagal memperbarui data user.");
      }
    } catch (e: any) {
      console.error("Save user error:", e);
      toast.error(e.message || "Terjadi kesalahan saat menyimpan perubahan user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignToProject = async () => {
    if (!selectedAssignProjectId) {
      toast.error("Pilih project terlebih dahulu");
      return;
    }

    try {
      const p = projects.find((proj) => proj.id === selectedAssignProjectId);
      if (!p) return;

      const userId = user.id || user.uid;

      const res = await assignUserToProject(p.id, null, {
        newMemberId: userId,
        newMemberRole: selectedAssignProjectRole,
      });

      if (res && res.status === "error") {
        throw new Error(res.message);
      }

      toast.success(`Pengguna berhasil ditugaskan ke project ${p.name}`);
      setSelectedAssignProjectId("");

      setUserProjectsList((prev) => [
        ...prev,
        {
          ...p,
          memberRoles: { ...(p.memberRoles || {}), [userId]: selectedAssignProjectRole },
        },
      ]);

      if (onUserUpdated) onUserUpdated();
    } catch (e: any) {
      toast.error("Gagal menugaskan pengguna ke project: " + (e.message || e));
    }
  };

  const handleRemoveFromProject = async (projectId: string) => {
    try {
      const p = projects.find((proj) => proj.id === projectId);
      if (!p) return;

      const userId = user.id || user.uid;

      const res = await removeUserFromProject(p.id, null, userId);

      if (res && res.status === "error") {
        throw new Error(res.message);
      }

      toast.success(`Pengguna berhasil dikeluarkan dari project ${p.name}`);

      setUserProjectsList((prev) => prev.filter((proj) => proj.id !== projectId));

      if (onUserUpdated) onUserUpdated();
    } catch (e: any) {
      toast.error("Gagal mengeluarkan pengguna dari project: " + (e.message || e));
    }
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditPassword(pass);
    navigator.clipboard.writeText(pass);
    toast.success(`Password acak dibuat: "${pass}". Berhasil disalin ke clipboard!`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-sunken overflow-y-auto p-3 md:p-6">
      <div className="flex flex-col space-y-5 min-h-full animate-in fade-in duration-700">
        {/* Velzon Sticky Header Bar */}
        <div className="bg-surface border border-border-subtle rounded-lg px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-soft">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 bg-surface-muted hover:bg-indigo-600 hover:text-content-inverse text-content-body rounded-md transition-all flex items-center gap-2 text-xs font-medium cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("userDetail.backToUserMgmt")}</span>
            </button>
            <div className="h-4 w-px bg-surface-strong " />
            <div className="flex flex-col">
              <span className="text-xs sm:text-[11px] font-medium text-indigo-600 tracking-wider uppercase">
                {t("userDetail.profileMatrixTitle")}
              </span>
              <h1 className="text-sm font-medium text-content-strong ">
                {user.displayName || user.username}
              </h1>
            </div>
          </div>

          <button
            onClick={handleSaveUser}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-content-inverse rounded-md text-xs font-medium shadow-xs transition disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{t("userDetail.saveUserChanges")}</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="w-full space-y-5 flex-1">
          {/* Profile Card Header */}
          <div className="bg-surface p-5 rounded-lg shadow-xs border border-border-subtle flex flex-col md:flex-row items-center md:items-start gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-bl-full pointer-events-none opacity-60" />

            <div className="relative group cursor-pointer shrink-0 z-10">
              <UserAvatar
                user={{ ...user, photoURL: previewUrl || photoURL } as any}
                className="w-20 h-20 text-2xl shadow-soft border-2 border-surface ring-2 ring-indigo-50 shrink-0"
              />
              {previewUrl && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-amber-500 text-content-inverse text-xs sm:text-[11px] sm:text-[9px] font-semibold px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap z-20">
                  {t("userDetail.preview")}
                </span>
              )}
              <label className="absolute inset-0 bg-black/50 text-content-inverse rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity ring-2 ring-indigo-50 border-2 border-surface ">
                <span className="text-xs sm:text-[10px] font-medium uppercase tracking-wider">
                  {isUploading ? "..." : "Pilih Foto"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isUploading || isSaving}
                />
              </label>
            </div>

            <div className="flex-1 text-center md:text-left space-y-2 z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-medium text-content-strong ">
                    {user.displayName || user.username}
                  </h2>
                  <p className="text-xs text-content-subtle mt-0.5">
                    @{user.username || user.email?.split("@")[0]}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium uppercase border shadow-xs",
                      editRole === "admin"
                        ? "bg-rose-500/10 text-rose-700 border-rose-500/30 "
                        : editRole === "head"
                          ? "bg-purple-500/10 text-purple-700 border-purple-500/30 "
                          : editRole === "user"
                            ? "bg-indigo-500/10 text-indigo-700 border-indigo-500/30 "
                            : "bg-surface-muted text-content-body border-border-subtle "
                    )}
                  >
                    {editRole === "admin" && <ShieldCheck className="w-3.5 h-3.5 shrink-0" />}
                    {editRole === "head" && <Award className="w-3.5 h-3.5 shrink-0" />}
                    {editRole === "user" && <Users className="w-3.5 h-3.5 shrink-0" />}
                    {editRole === "viewer" && <Eye className="w-3.5 h-3.5 shrink-0" />}
                    <span>{editRole}</span>
                  </span>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium uppercase border shadow-xs",
                      editStatus === "approved"
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 "
                        : editStatus === "pending"
                          ? "bg-amber-500/10 text-amber-700 border-amber-500/30 "
                          : "bg-rose-500/10 text-rose-700 border-rose-500/30 "
                    )}
                  >
                    {editStatus === "approved" ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    <span>{editStatus}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-border-faint ">
                <div className="flex items-center gap-2.5 text-xs text-content-secondary ">
                  <div className="p-1.5 bg-indigo-500/10 text-indigo-600 rounded-md">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle">
                      {t("userDetail.emailAddress")}
                    </div>
                    <div className="font-medium text-content-strong text-xs">
                      {editEmail || "Tidak tersedia"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-content-secondary ">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-md">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle">
                      {t("userDetail.whatsapp")}
                    </div>
                    <div className="font-medium text-content-strong text-xs">
                      {editPhone || "Tidak tersedia"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-content-secondary ">
                  <div className="p-1.5 bg-purple-500/10 text-purple-600 rounded-md">
                    <Building className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-[10px] uppercase font-medium text-content-subtle">
                      {t("userDetail.deptPosition")}
                    </div>
                    <div className="font-medium text-content-strong text-xs">
                      {getDeptName(editDepartment)} • {getPosName(editPosition)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Grid Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Account & Organization Settings + Permissions Matrix (5 cols) */}
            <div className="xl:col-span-5 space-y-5">
              {/* Account & Organization Form */}
              <div className="bg-surface border border-border-subtle rounded-lg p-4 space-y-4 shadow-xs">
                <h4 className="font-medium text-content-strong text-xs uppercase tracking-wider border-b border-border-subtle pb-2.5 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-500" />
                  {t("userDetail.accountOrgSettings")}
                </h4>

                <div className="space-y-3">
                  {isAdmin && (
                    <>
                      {/* System Role Selection */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-content-body ">
                          {t("userDetail.systemRole")}
                        </label>
                        <select
                          value={editRole}
                          onChange={(e) => {
                            const newRole = e.target.value as AppRole;
                            setEditRole(newRole);
                            setEditPermissions(
                              ROLE_DEFAULT_PERMISSIONS[newRole] ||
                                ROLE_DEFAULT_PERMISSIONS.member ||
                                ROLE_DEFAULT_PERMISSIONS.viewer ||
                                (ROLE_DEFAULT_PERMISSIONS.owner as UserPermissions)
                            );
                          }}
                          className="w-full px-3 py-1.5 bg-surface border border-border-subtle rounded-md text-xs font-medium text-content-strong outline-none focus:border-indigo-500 transition-all cursor-pointer"
                        >
                          {/* #82 — TIDAK ADA opsi yang ditulis di sini. Daftarnya
 berasal dari Master Data, dan nilai yang disimpan
 adalah `code`, bukan label. Versi lama menulis lima
 opsi langsung lalu MENAMBAHKAN Master Data di
 bawahnya, sehingga Department Head muncul dua kali
 dengan nilai berbeda: `head` dan "Department Head". */}
                          {peranSistem.length === 0 && (
                            <option value="">
                              (katalog peran sistem kosong — isi di Master Data)
                            </option>
                          )}
                          {peranSistem.map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Role Description Card */}
                      {editRole && ROLE_DESCRIPTIONS[editRole] && (
                        <div className="p-2.5 rounded-md border text-xs leading-relaxed flex gap-2.5 bg-indigo-500/10 border-indigo-500/30 text-indigo-900 ">
                          <div className="shrink-0 mt-0.5">{ROLE_DESCRIPTIONS[editRole].icon}</div>
                          <div className="space-y-0.5">
                            <p className="font-medium text-xs text-indigo-950 ">
                              {ROLE_DESCRIPTIONS[editRole].label}
                            </p>
                            <p className="text-xs sm:text-[11px] text-content-secondary ">
                              {ROLE_DESCRIPTIONS[editRole].desc}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Account Status */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-content-body ">
                          {t("userDetail.accountStatus")}
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as any)}
                          className="w-full px-3 py-1.5 bg-surface border border-border-subtle rounded-md text-xs font-medium text-content-strong outline-none focus:border-indigo-500 transition-all cursor-pointer"
                        >
                          <option value="approved">{t("userDetail.activeApproved")}</option>
                          <option value="pending">{t("userDetail.waitingApproval")}</option>
                          <option value="rejected">{t("userDetail.suspendedRejected")}</option>
                        </select>
                      </div>

                      {/* Department & Position */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-content-body ">
                            {t("userDetail.department")}
                          </label>
                          <select
                            value={editDepartment}
                            onChange={(e) => setEditDepartment(e.target.value)}
                            className="w-full px-3 py-1.5 bg-surface border border-border-subtle rounded-md text-xs font-medium text-content-strong outline-none focus:border-indigo-500 transition-all cursor-pointer"
                          >
                            <option value="">{t("userDetail.selectDepartment")}</option>
                            {(departments.length > 0
                              ? departments
                              : masterData.filter((d) => d.type === "department")
                            ).map((opt) => (
                              <option key={opt.id || opt.code} value={opt.id || opt.code}>
                                {opt.name || opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-content-body ">
                            {t("userDetail.position")}
                          </label>
                          <select
                            value={editPosition}
                            onChange={(e) => setEditPosition(e.target.value)}
                            className="w-full px-3 py-1.5 bg-surface border border-border-subtle rounded-md text-xs font-medium text-content-strong outline-none focus:border-indigo-500 transition-all cursor-pointer"
                          >
                            <option value="">{t("userDetail.selectPosition")}</option>
                            {(positions.length > 0
                              ? positions
                              : masterData.filter(
                                  (d) => d.type === "jabatan" || d.type === "position"
                                )
                            ).map((opt) => (
                              <option key={opt.id || opt.code} value={opt.id || opt.code}>
                                {opt.name || opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Full Name & Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-content-body ">
                      {t("userDetail.fullName")}
                    </label>
                    <input
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder={t("userDetail.fullNamePlaceholder")}
                      className="w-full px-3 py-1.5 border border-border-subtle rounded-md text-xs font-medium outline-none focus:border-indigo-500 bg-surface text-content-strong "
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-content-body ">
                        {t("userDetail.email")}
                      </label>
                      <input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder={t("userDetail.emailPlaceholder")}
                        className="w-full px-3 py-1.5 border border-border-subtle rounded-md text-xs font-medium outline-none focus:border-indigo-500 bg-surface text-content-strong "
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-content-body ">
                        {t("userDetail.phone")}
                      </label>
                      <input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder={t("userDetail.phonePlaceholder")}
                        className="w-full px-3 py-1.5 border border-border-subtle rounded-md text-xs font-medium outline-none focus:border-indigo-500 bg-surface text-content-strong "
                      />
                    </div>
                  </div>

                  {/* Password Reset */}
                  <div className="space-y-1 pt-1 border-t border-border-faint ">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-content-body ">
                        {t("userDetail.updatePassword")}
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-xs sm:text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <Key className="w-3 h-3" /> Buat Password Acak
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder={t("userDetail.passwordPlaceholder")}
                      className="w-full px-3 py-1.5 border border-border-subtle rounded-md text-xs font-medium outline-none focus:border-indigo-500 bg-surface text-content-strong "
                    />
                  </div>
                </div>
              </div>

              {/* Custom System Permissions Matrix Table */}
              {isAdmin && (
                <div className="bg-surface border border-border-subtle rounded-lg p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
                    <div>
                      <h4 className="font-medium text-content-strong text-xs uppercase tracking-wider">
                        {t("userDetail.activePermissions")}
                      </h4>
                      <p className="text-xs sm:text-[11px] text-content-muted font-normal mt-0.5">
                        {t("userDetail.permissionHint")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetToRoleDefaults}
                      className="px-2.5 py-1 text-xs sm:text-[11px] bg-surface-muted hover:bg-surface-strong text-content-body rounded-md font-medium transition flex items-center gap-1 shrink-0"
                      title={t("userDetail.resetRoleDefaultHint")}
                    >
                      <RotateCcw className="w-3 h-3" /> {t("userDetail.resetRoleDefault")}
                    </button>
                  </div>

                  {editRole === "admin" && (
                    <div className="flex items-center gap-2 text-amber-700 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-md text-xs">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>
                        {t("userDetail.adminAccessPrefix")} <strong>Administrator</strong>{" "}
                        {t("userDetail.adminAccessSuffix")}
                      </span>
                    </div>
                  )}

                  <div className="border border-border-subtle rounded-md overflow-hidden shadow-xs max-w-full overflow-x-auto">
                    <ResponsiveTable className="w-full text-left text-xs border-collapse">
                      <thead className="bg-surface-sunken border-b border-border-subtle ">
                        <tr>
                          <th className="py-2 px-3 font-medium text-xs sm:text-[10px] text-content-muted uppercase">
                            {t("userDetail.module")}
                          </th>
                          {(["read", "create", "update", "delete"] as const).map((action) => (
                            <th
                              key={action}
                              className="py-2 px-1 font-medium text-xs sm:text-[10px] text-content-muted uppercase text-center w-14"
                            >
                              {action}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-faint bg-surface ">
                        {(Object.keys(MODULE_DESCRIPTIONS) as Array<keyof UserPermissions>).map(
                          (module) => {
                            const moduleInfo = MODULE_DESCRIPTIONS[module] || {
                              label: module,
                              desc: "",
                            };
                            return (
                              <tr
                                key={module}
                                className="hover:bg-surface-sunken/50 transition-colors"
                              >
                                <td className="py-2 px-3 font-medium text-content-body text-xs">
                                  <div
                                    className="inline-flex items-center gap-1"
                                    title={moduleInfo.desc}
                                  >
                                    <span>{moduleInfo.label}</span>
                                  </div>
                                </td>
                                {(["read", "create", "update", "delete"] as const).map((action) => {
                                  const isChecked = editPermissions[module]?.[action];
                                  const isDefaultGranted =
                                    ROLE_DEFAULT_PERMISSIONS[editRole]?.[module]?.[action];
                                  const isOverride = isChecked !== isDefaultGranted;

                                  return (
                                    <td key={action} className="py-1.5 px-1 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleTogglePermission(module, action)}
                                        className={cn(
                                          "w-5 h-5 rounded-md flex items-center justify-center mx-auto transition-all cursor-pointer border relative",
                                          isChecked
                                            ? "bg-indigo-600 text-content-inverse border-indigo-500 shadow-xs"
                                            : "bg-surface-sunken text-content-subtle border-border-subtle hover:bg-surface-muted ",
                                          isOverride && "ring-2 ring-amber-400 ring-offset-1 "
                                        )}
                                        title={
                                          isChecked
                                            ? `Granted (${isOverride ? "Explicit Override" : "Role Default"}). Click to revoke.`
                                            : `Revoked (${isOverride ? "Explicit Override" : "Role Default"}). Click to grant.`
                                        }
                                      >
                                        <Check
                                          className={cn(
                                            "w-3 h-3 text-current",
                                            isChecked ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {isOverride && (
                                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full ring-1 ring-white " />
                                        )}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </ResponsiveTable>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Work Overview, Project Involvement & Tasks (7 cols) */}
            <div className="xl:col-span-7 space-y-5">
              {/* Work Overview Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface border border-border-subtle p-4 rounded-lg flex items-center gap-3 shadow-xs">
                  <div className="w-9 h-9 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-[10px] text-content-subtle font-medium uppercase tracking-wider block">
                      {t("userDetail.totalRelatedProjects")}
                    </span>
                    <span className="text-base font-medium text-content-strong leading-none">
                      {userProjectsList.length} Proyek
                    </span>
                  </div>
                </div>

                <div className="bg-surface border border-border-subtle p-4 rounded-lg flex items-center gap-3 shadow-xs">
                  <div className="w-9 h-9 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-[10px] text-content-subtle font-medium uppercase tracking-wider block">
                      {t("userDetail.assignedTasks")}
                    </span>
                    <span className="text-base font-medium text-content-strong leading-none">
                      {userTasks.length} Tugas
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Delegasi Project Baru */}
              {isAdmin && (
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 shadow-xs space-y-3">
                  <div className="space-y-0.5">
                    <h4 className="font-medium text-indigo-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-indigo-600 shrink-0" />
                      {t("userDetail.delegateNewProject")}
                    </h4>
                    <p className="text-xs text-content-secondary ">
                      {t("userDetail.delegateHint")}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <div className="sm:col-span-5">
                      <select
                        value={selectedAssignProjectId}
                        onChange={(e) => setSelectedAssignProjectId(e.target.value)}
                        className="w-full px-3 py-1.5 bg-surface border border-border-subtle rounded-md text-xs font-medium text-content-strong outline-none focus:border-indigo-500 truncate"
                      >
                        <option value="">{t("userDetail.pickProject")}</option>
                        {projects
                          .filter((p) => {
                            const r = p.memberRoles || {};
                            const uId = user.id || user.uid;
                            return (
                              !Object.keys(r).includes(uId) && !(p.members || []).includes(uId)
                            );
                          })
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <select
                        value={selectedAssignProjectRole}
                        onChange={(e) => setSelectedAssignProjectRole(e.target.value)}
                        className="w-full px-3 py-1.5 bg-surface border border-border-subtle rounded-md text-xs font-medium text-content-strong outline-none focus:border-indigo-500"
                      >
                        {/* #82 — dari Master Data, bukan ditulis di sini. Versi
 lama menawarkan `lead` dan `member` yang tidak ada di
 katalog mana pun, sementara System Analyst, Business
 Analyst, Developer, dan QA tidak bisa dipilih. */}
                        {peranProyek.length === 0 && (
                          <option value="">
                            (katalog peran proyek kosong — isi di Master Data)
                          </option>
                        )}
                        {peranProyek.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <button
                        type="button"
                        onClick={handleAssignToProject}
                        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-content-inverse rounded-md text-xs font-medium shadow-xs transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t("userDetail.delegate")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Sub-Team Subordinate Selection (When Project Admin / Manager / Lead is selected) */}
                  {["admin", "manager", "lead"].includes(
                    selectedAssignProjectRole.toLowerCase()
                  ) && (
                    <div className="pt-2 space-y-1.5 border-t border-indigo-500/30 ">
                      <label className="text-xs sm:text-[11px] font-medium text-indigo-950 uppercase tracking-wider block">
                        {t("userDetail.selectSubTeam")}
                      </label>
                      <div className="max-h-36 overflow-y-auto bg-surface border border-border-subtle rounded-md p-2 space-y-1 custom-scrollbar">
                        {availableUsers
                          .filter((u) => (u.id || u.uid) !== (user.id || user.uid))
                          .map((u) => {
                            const uId = u.id || u.uid;
                            const isChecked = selectedSubordinateIds.includes(uId);
                            return (
                              <label
                                key={uId}
                                className="flex items-center gap-2 text-xs text-content-body hover:bg-surface-sunken p-1 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedSubordinateIds(
                                        selectedSubordinateIds.filter((id) => id !== uId)
                                      );
                                    } else {
                                      setSelectedSubordinateIds([...selectedSubordinateIds, uId]);
                                    }
                                  }}
                                  className="rounded border-border-subtle text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="font-medium">
                                  {u.displayName || u.username || u.email}
                                </span>
                                <span className="text-xs sm:text-[10px] text-content-subtle">
                                  ({u.email})
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* List Proyek Terkait */}
              <div className="bg-surface p-4 rounded-lg shadow-xs border border-border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layout className="w-4 h-4 text-indigo-600 " />
                    <h3 className="text-xs font-medium text-content-strong uppercase tracking-wider">
                      Proyek Terkait ({userProjectsList.length})
                    </h3>
                  </div>
                </div>

                {userProjectsList.length === 0 ? (
                  <p className="text-xs text-content-subtle italic py-6 text-center">
                    {t("userDetail.noActiveProject")}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    {userProjectsList.map((p) => {
                      const uId = user.id || user.uid;

                      // #82 — label diambil dari katalog Master Data, bukan
                      // menampilkan nilai mentah dari database.
                      //
                      // Versi lama menampilkan `manager` apa adanya, sehingga
                      // layar ini menyebut "MANAGER" sementara Master Data
                      // menyebut "Project Manager" — dua nama untuk hal yang
                      // sama, dan pemilik proyek wajar mengiranya data berbeda.
                      //
                      // Cadangannya pun dulu ditulis di kode ("Owner"/"Member").
                      // Kini pemilik proyek dikenali dari katalog lewat kode
                      // `owner`, dan bila peran tidak ada di katalog, KODE
                      // MENTAHNYA yang ditampilkan — supaya nilai lama yang
                      // belum dimigrasikan TERLIHAT, bukan disamarkan.
                      const kodePeranProyek =
                        p.memberRoles?.[uId] || (p.ownerId === uId ? "owner" : "");
                      const roleInProject = kodePeranProyek
                        ? labelPeran(peranProyek, kodePeranProyek)
                        : "—";
                      const peranDikenal = Boolean(cariPeran(peranProyek, kodePeranProyek));
                      const projectTasks = userTasks.filter((t) => t.projectId === p.id);

                      return (
                        <div
                          key={p.id}
                          className="p-3 bg-surface-sunken border border-border-subtle rounded-md space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-xs text-content-strong ">
                                {p.name}
                              </div>
                              <div className="text-xs sm:text-[10px] font-mono text-indigo-600 uppercase mt-0.5">
                                {p.key}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-xs sm:text-[10px] font-medium uppercase px-2 py-0.5 rounded-md border",
                                  peranDikenal
                                    ? "bg-indigo-500/15 text-indigo-700 border-indigo-500/30 "
                                    : "bg-amber-500/15 text-amber-800 border-amber-500/30 "
                                )}
                                title={
                                  peranDikenal
                                    ? undefined
                                    : "Peran ini tidak ada di katalog Master Data — perlu dimigrasikan"
                                }
                              >
                                {roleInProject}
                              </span>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromProject(p.id)}
                                  className="p-1 text-content-subtle hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                                  title={t("userDetail.removeFromProject")}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Tasks in project */}
                          {projectTasks.length > 0 && (
                            <div className="pt-1.5 border-t border-border-subtle/60 space-y-1">
                              <div className="text-xs sm:text-[10px] text-content-subtle font-medium uppercase">
                                Tugas Terdelegasi ({projectTasks.length}):
                              </div>
                              <div className="space-y-1">
                                {projectTasks.map((t) => (
                                  <div
                                    key={t.id}
                                    className="flex items-center justify-between text-xs bg-surface p-1.5 px-2 rounded-md border border-border-subtle/80 "
                                  >
                                    <span className="font-medium text-content-body truncate max-w-[240px]">
                                      {t.title}
                                    </span>
                                    <span className="text-xs sm:text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-content-secondary ">
                                      {t.status || "todo"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* List Tugas / Issue Terkait */}
              <div className="bg-surface p-4 rounded-lg shadow-xs border border-border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-violet-600 " />
                    <h3 className="text-xs font-medium text-content-strong uppercase tracking-wider">
                      Semua Tugas Ditugaskan ({userTasks.length})
                    </h3>
                  </div>
                </div>
                {userTasks.length === 0 ? (
                  <p className="text-xs text-content-subtle italic py-6 text-center">
                    {t("userDetail.noAssignedTask")}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {userTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 bg-surface-sunken border border-border-subtle rounded-md flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-xs text-content-strong truncate max-w-[280px]">
                            {t.title}
                          </div>
                          <div className="text-xs sm:text-[10px] font-mono text-content-subtle uppercase mt-0.5">
                            {t.key || "TASK"}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-xs sm:text-[10px] font-medium uppercase px-2 py-0.5 rounded-md border",
                            t.status === "completed" || t.status === "done"
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 "
                              : "bg-amber-500/10 text-amber-700 border-amber-500/30 "
                          )}
                        >
                          {t.status || "todo"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailView;
