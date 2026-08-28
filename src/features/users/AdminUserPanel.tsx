import { useTranslation } from "react-i18next";
import { StyledDropdown } from "../../components/ui/CommonComponents";
import React from "react";
import { katalogPeranSistem } from "../../lib/roleCatalog";
import {
  Users,
  UserPlus,
  Search,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Layout,
  ChevronDown,
  Copy,
  UserCog,
  Info,
  Shield,
  Download,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { AppRole } from "../../types";
import { normalkanPeran, sebagaiPeranSistem } from "../../types/roles";
import { AdminUserPanelProps } from "./types";
import { useAdminUsers } from "./hooks";
import { Button, Modal, UserAvatar } from "./styles";
import { toast } from "sonner";
import { confirmDeleteAlert, showSuccessAlert } from "../../lib/sweetalert";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { DEFAULT_PERMISSIONS as ROLE_DEFAULT_PERMISSIONS } from "../../lib/permissions";
import {
  assignUserToProject,
  removeUserFromProject,
  registerUser,
  updateUser,
  deleteUser,
} from "./services/users.service";

const Input = ({ value, onChange, placeholder, type = "text", className = "", ...props }: any) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full px-4 py-3 bg-surface-sunken border border-border-subtle rounded-xl text-sm font-medium text-content-strong placeholder:text-content-subtle placeholder:font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-surface outline-none transition-all ${className}`}
    {...props}
  />
);

export const AdminUserPanel: React.FC<AdminUserPanelProps> = (props) => {
  const { t } = useTranslation();
  const { projects, tasks, masterData } = props;

  // #82 — peran sistem dibaca dari Master Data, bukan ditulis di JSX.
  const peranSistem = React.useMemo(() => katalogPeranSistem(masterData), [masterData]);
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);
  const [isInviteSuccessModalOpen, setIsInviteSuccessModalOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"overview" | "settings">("overview");

  // Project Assignment State
  const [selectedAssignProjectId, setSelectedAssignProjectId] = React.useState("");
  const [selectedAssignProjectRole, setSelectedAssignProjectRole] = React.useState("member");
  const [isAssigningProject, setIsAssigningProject] = React.useState(false);
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = React.useState<string[]>([]);

  // Tooltip Mouse Event Handler State
  const [hoveredTooltip, setHoveredTooltip] = React.useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const handleMouseEnter = (text: string, e: React.MouseEvent) => {
    const tooltipWidth = 260; // max-w-xs approximate
    const tooltipHeight = 70;

    let x = e.clientX;
    let y = e.clientY;

    // Safety boundaries to avoid viewport overflow
    if (x + tooltipWidth > window.innerWidth) {
      x = window.innerWidth - tooltipWidth - 20;
    }
    if (y + tooltipHeight > window.innerHeight) {
      y = window.innerHeight - tooltipHeight - 20;
    }

    setHoveredTooltip({
      text,
      x,
      y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (hoveredTooltip) {
      const tooltipWidth = 260;
      const tooltipHeight = 70;
      let x = e.clientX;
      let y = e.clientY;

      if (x + tooltipWidth > window.innerWidth) {
        x = window.innerWidth - tooltipWidth - 20;
      }
      if (y + tooltipHeight > window.innerHeight) {
        y = window.innerHeight - tooltipHeight - 20;
      }

      setHoveredTooltip({
        text: hoveredTooltip.text,
        x,
        y,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredTooltip(null);
  };

  const handleAssignProject = async (userId: string) => {
    if (!selectedAssignProjectId) {
      toast.error(t("toast.pickProjectFirst"));
      return;
    }
    setIsAssigningProject(true);
    try {
      const payload: any = {
        newMemberId: userId,
        newMemberRole: selectedAssignProjectRole,
      };
      if (selectedAssignProjectRole === "admin") {
        payload.teamMemberIds = selectedTeamMemberIds;
      }

      const data = await assignUserToProject(selectedAssignProjectId, props.currentUserId, payload);
      if (data.status === "success") {
        toast.success(t("toast.userAddedToProject"));
        setSelectedAssignProjectId("");
        setSelectedAssignProjectRole("member");
        setSelectedTeamMemberIds([]);
        if (props.onRefreshProjects) {
          props.onRefreshProjects();
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 800);
        }
      } else {
        toast.error(data.message || "Gagal menambahkan ke project");
      }
    } catch (e) {
      console.error(e);
      toast.error(t("toast.addToProjectFailed"));
    } finally {
      setIsAssigningProject(false);
    }
  };

  const handleRemoveProject = async (projectId: string, userId: string) => {
    const isConfirmed = await confirmDeleteAlert(
      t("alerts.removeUserTitle"),
      t("alerts.removeUserText")
    );
    if (!isConfirmed) return;

    try {
      const data = await removeUserFromProject(projectId, props.currentUserId, userId);
      if (data.status === "success") {
        showSuccessAlert(t("alerts.successTitle"), t("alerts.userRemoved"));
        if (props.onRefreshProjects) {
          props.onRefreshProjects();
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 800);
        }
      } else {
        toast.error(data.message || "Gagal menghapus user dari project");
      }
    } catch (e) {
      console.error(e);
      toast.error(t("toast.removeFromProjectFailed"));
    }
  };

  const [addPeopleUsername, setAddPeopleUsername] = React.useState("");
  const [addPeopleFullName, setAddPeopleFullName] = React.useState("");
  const [addPeopleEmail, setAddPeopleEmail] = React.useState("");
  const [addPeoplePassword, setAddPeoplePassword] = React.useState("");
  const [addPeoplePhone, setAddPeoplePhone] = React.useState("");
  const [addPeopleDepartment, setAddPeopleDepartment] = React.useState("");
  const [addPeopleJabatan, setAddPeopleJabatan] = React.useState("");
  const [addPeopleRole, setAddPeopleRole] = React.useState<AppRole>("user");
  const [addPeopleStatus, setAddPeopleStatus] = React.useState<"approved" | "pending" | "rejected">(
    "approved"
  );
  const [successEmail, setSuccessEmail] = React.useState("");

  const handleAddPeople = async () => {
    /**
     * #189 — penolakan yang TERLIHAT, bukan sekadar tidak terjadi apa-apa.
     *
     * Penjaga ini sudah ada sebelumnya beserta `toast.error`-nya, tetapi tidak
     * pernah bisa berjalan: tombol "Add Person" memakai `disabled` yang
     * mencakup keempat field kosong, sehingga `onClick` tidak pernah menyala
     * dan toast-nya menjadi kode mati. Yang dilihat pengguna adalah tombol
     * yang tidak bereaksi — dan tombol yang tidak bereaksi terbaca sebagai
     * aplikasi rusak, bukan sebagai "ada yang belum Anda isi".
     *
     * Sekarang tombolnya menyala, penolakannya terjadi di sini, dan alasannya
     * ditempelkan ke FIELD-nya masing-masing — pola yang sama dengan
     * `LoginScreen.tsx`, yang juga memasangkan pesan per-field dengan satu
     * toast ringkasan.
     */
    const galat: typeof addPeopleErrors = {};
    if (!addPeopleFullName.trim()) galat.fullName = t("users.fieldRequired");
    if (!addPeoplePassword.trim()) galat.password = t("users.fieldRequired");

    // Username dan email memakai ULANG `usernameError`/`emailError` yang sudah
    // punya tempat tampil di bawah field masing-masing. Menambah saluran pesan
    // kedua untuk field yang sama akan memunculkan dua baris merah sekaligus.
    const kurangUsername = !addPeopleUsername.trim();
    const kurangEmail = !addPeopleEmail.trim();
    if (kurangUsername) setUsernameError(t("users.fieldRequired"));
    if (kurangEmail) setEmailError(t("users.fieldRequired"));

    if (Object.keys(galat).length > 0 || kurangUsername || kurangEmail) {
      setAddPeopleErrors(galat);
      toast.error(t("toast.allFieldsRequired"));
      return;
    }

    setAddPeopleErrors({});

    try {
      const normalizedUsername = addPeopleUsername.trim().toLowerCase().replace(/\s+/g, "_");
      const selectedRolePermissions =
        ROLE_DEFAULT_PERMISSIONS[addPeopleRole] || ROLE_DEFAULT_PERMISSIONS.viewer;

      const data = await registerUser({
        username: normalizedUsername,
        password: addPeoplePassword,
        displayName: addPeopleFullName,
        email: addPeopleEmail,
        department: addPeopleDepartment,
        position: addPeopleJabatan,
        status: addPeopleStatus,
        role: addPeopleRole,
        permissions: selectedRolePermissions,
        phone: addPeoplePhone,
      });

      if (data.status !== "success") {
        toast.error(data.message || "Username sudah digunakan atau register gagal");
        return;
      }

      setSuccessEmail(addPeopleEmail);
      setIsInviteModalOpen(false);
      setIsInviteSuccessModalOpen(true);

      setAddPeopleUsername("");
      setAddPeopleFullName("");
      setAddPeopleEmail("");
      setAddPeoplePassword("");
      setAddPeoplePhone("");
      setAddPeopleDepartment("");
      setAddPeopleJabatan("");
      setAddPeopleRole("user");
      setAddPeopleStatus("approved");
    } catch (e) {
      console.error("Error adding user:", e);
      toast.error(t("toast.addUserFailed"));
    }
  };

  const {
    users,
    searchTerm,
    setSearchTerm,
    loading,
    selectedUser,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    // Item #160 — `setFilterRole`/`setFilterStatus` tidak lagi diambil: nol
    // pemakai sesudah dua dropdown-nya dihapus. Nilainya sendiri TETAP diambil
    // karena masih jadi kebergantungan efek pembersih pilihan di bawah; hook
    // `useAdminUsers` sengaja tidak disentuh supaya saringannya bisa dipasang
    // kembali tanpa membongkar apa pun.
    filterRole,
    filterStatus,
    handleDeleteUser,
    filteredUsers,
    totalPages,
    paginatedUsers,
    fetchUsers,
  } = useAdminUsers();

  const handleSort = (field: "name" | "department" | "role" | "status") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Point 1: Bulk Actions State
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
  const [isBulkActionPending, setIsBulkActionPending] = React.useState(false);

  // Point 5: Real-time validation errors & Password Strength Indicator
  const [usernameError, setUsernameError] = React.useState("");
  const [emailError, setEmailError] = React.useState("");

  /**
   * #189 — pesan "wajib diisi" per field pada form Add Person.
   *
   * `usernameError`/`emailError` di atas hanya menangani format dan duplikat.
   * Tidak ada satu pun yang memberi tahu bahwa sebuah field WAJIB diisi, dan
   * itulah yang dilaporkan: membuka modal lalu langsung menekan "Add Person"
   * tidak menghasilkan apa-apa. Diam, bukan menolak.
   */
  const [addPeopleErrors, setAddPeopleErrors] = React.useState<{
    username?: string;
    fullName?: string;
    email?: string;
    password?: string;
  }>({});
  const [passwordStrength, setPasswordStrength] = React.useState<"weak" | "medium" | "strong" | "">(
    ""
  );

  // Clean-up selections on filters change
  React.useEffect(() => {
    setSelectedUserIds([]);
  }, [searchTerm, filterRole, filterStatus]);

  // Username validation helper
  const handleUsernameChange = (val: string) => {
    setAddPeopleUsername(val);
    if (!val) {
      // #189 — lewat i18n. Sebelumnya string harfiah, sehingga pengguna
      // berbahasa Inggris melihat pesan Indonesia di form ini saja.
      setUsernameError(t("users.fieldRequired"));
      return;
    }
    const clean = val.trim().toLowerCase();
    if (clean !== val) {
      setUsernameError("Username harus huruf kecil semua, tanpa spasi");
      return;
    }
    const regex = /^[a-z0-9_]{3,20}$/;
    if (!regex.test(val)) {
      setUsernameError("Hanya huruf kecil, angka, dan underscore (3-20 karakter)");
    } else {
      setUsernameError("");
    }
  };

  // Email validation helper
  const handleEmailChange = (val: string) => {
    setAddPeopleEmail(val);
    if (!val) {
      setEmailError(t("users.fieldRequired"));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      setEmailError("Format email tidak valid (contoh: nama@domain.com)");
    } else {
      setEmailError("");
    }
  };

  // Password Strength check helper
  const handlePasswordChange = (val: string) => {
    setAddPeoplePassword(val);
    if (!val) {
      setPasswordStrength("");
      return;
    }
    if (val.length < 6) {
      setPasswordStrength("weak");
    } else if (val.length < 10) {
      const hasNumbers = /\d/.test(val);
      const hasSps = /[^a-zA-Z0-9]/.test(val);
      if (hasNumbers || hasSps) {
        setPasswordStrength("medium");
      } else {
        setPasswordStrength("weak");
      }
    } else {
      const hasNumbers = /\d/.test(val);
      const hasSps = /[^a-zA-Z0-9]/.test(val);
      if (hasNumbers && hasSps) {
        setPasswordStrength("strong");
      } else {
        setPasswordStrength("medium");
      }
    }
  };

  // Point 2: Export currently filtered users to CSV file
  const handleExportCSV = () => {
    try {
      if (filteredUsers.length === 0) {
        toast.error(t("toast.noUserToExport"));
        return;
      }

      const headers = [
        "ID",
        "Username",
        "Nama Lengkap",
        "Email",
        "No HP/WA",
        "Role",
        "Status",
        "Departemen",
        "Jabatan",
        "Dibuat Pada",
      ];
      const rows = filteredUsers.map((u) => [
        u.id,
        u?.username || "",
        u?.displayName || "",
        u?.email || "",
        u.phone || "",
        u.role || "",
        u.status || "",
        u.department ? getDepartmentName(u.department) : "",
        u.position ? getPositionName(u.position) : "",
        (u as any).createdAt || "",
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [
          headers.join(","),
          ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
        ].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `user_list_export_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t("toast.usersExported", { count: filteredUsers.length }));
    } catch (e) {
      console.error(e);
      toast.error(t("toast.csvExportFailed"));
    }
  };

  // Point 1: Bulk Action executor calling existing backend PUT/DELETE
  const handleBulkAction = async (action: "approve" | "reject" | "delete" | AppRole) => {
    if (selectedUserIds.length === 0) {
      toast.error(t("toast.pickAtLeastOneUser"));
      return;
    }

    if (action === "delete") {
      const hasAdmins = filteredUsers.some(
        (u) => selectedUserIds.includes(u.id) && normalkanPeran(u.role) === "admin"
      );
      if (hasAdmins) {
        toast.error(t("toast.cannotBulkDeleteAdmin"));
        return;
      }
      const hasSelf = selectedUserIds.includes(props.currentUserId || "");
      if (hasSelf) {
        toast.error(t("toast.cannotBulkDeleteSelf"));
        return;
      }
    }

    setIsBulkActionPending(true);
    let successCount = 0;
    let failCount = 0;

    try {
      await Promise.all(
        selectedUserIds.map(async (userId) => {
          try {
            if (action === "delete") {
              const data = await deleteUser(userId);
              if (data.status === "success") successCount++;
              else failCount++;
            } else if (action === "approve" || action === "reject") {
              const data = await updateUser(userId, {
                status: action === "approve" ? "approved" : "rejected",
              });
              if (data.status === "success") successCount++;
              else failCount++;
            } else {
              const data = await updateUser(userId, { role: action });
              if (data.status === "success") successCount++;
              else failCount++;
            }
          } catch (err) {
            failCount++;
            console.error(`Error bulk action on user ${userId}:`, err);
          }
        })
      );

      if (action === "delete") {
        showSuccessAlert(
          t("alerts.successTitle"),
          t("alerts.bulkDeleteDone", { count: successCount })
        );
      } else {
        toast.success(t("toast.bulkActionDone", { sukses: successCount, gagal: failCount }));
      }
      setSelectedUserIds([]);
      fetchUsers();
    } catch (e) {
      console.error(e);
      toast.error(t("toast.bulkActionFailed"));
    } finally {
      setIsBulkActionPending(false);
    }
  };

  const getDepartmentName = (id: string) =>
    masterData.find((d) => d.type === "department" && d.id === id)?.label || id;
  const getPositionName = (id: string) =>
    masterData.find((d) => d.type === "jabatan" && d.id === id)?.label || id;

  const totalUsersCount = users.length;
  const approvedUsersCount = users.filter((u) => u.status === "approved").length;
  const pendingUsersCount = users.filter((u) => u.status === "pending").length;
  // #190 — lewat `normalkanPeran()` seperti diwajibkan `types/roles.ts`.
  // Hitungan inilah yang tampil sebagai kartu "ADMINISTRATOR: N"; dengan
  // perbandingan mentah, akun yang perannya tersimpan `Admin` tidak terhitung
  // dan kartunya menunjukkan angka yang lebih kecil dari kenyataan.
  const adminUsersCount = users.filter((u) => normalkanPeran(u.role) === "admin").length;

  if (loading) {
    return (
      <div className="p-8 text-center text-content-muted animate-pulse">{t("users.loading")}</div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-sunken w-full h-full">
      <div className="flex-1 overflow-y-auto p-3 md:p-6 w-full animate-in fade-in duration-700">
        <div className="flex flex-col space-y-6 min-h-full">
          {/* Header & Controls */}
          <div className="bg-surface rounded-lg shadow-soft border border-border-subtle/80 p-4 shrink-0">
            {/*
              Item #160 — dua saringan (Semua Peran, Semua Status) DIHAPUS atas
              permintaan pemilik proyek, dan pencarian naik sebaris dengan
              Ekspor + Tambah. Barisnya jadi satu, jadi `mb-4` pemisah antar
              baris ikut hilang — kalau ditinggal, ia menyisakan celah kosong
              di bawah kartu.
            */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-info/10 text-info-text rounded-lg flex items-center justify-center border border-info/20 shrink-0">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-content-strong tracking-tight leading-none">
                    {t("users.title")}
                  </h3>
                  <p className="text-content-subtle font-medium text-xs sm:text-[11px] mt-1">
                    {t("users.subtitle")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
                {/*
                  Pencarian dipindah ke sini dari baris kedua. `sm:w-64` dipakai
                  alih-alih `flex-1`: di baris ini tetangganya dua tombol
                  berlebar tetap, jadi `flex-1` akan meregang sampai menyentuh
                  judul di layar lebar. Di bawah `sm` ia kembali selebar penuh
                  supaya tidak terhimpit.
                */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-subtle" />
                  <input
                    type="text"
                    placeholder={t("users.searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-surface-sunken/50 border border-border-subtle/80 rounded focus:bg-surface focus:ring-1 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-xs h-8.5 font-medium text-content-strong placeholder:text-content-subtle"
                  />
                </div>
                <button
                  onClick={handleExportCSV}
                  className="btn-animation waves-effect waves-light bg-surface border border-border-subtle text-content-strong hover:bg-surface-sunken h-9 px-3.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-content-muted" /> {t("users.exportCsv")}
                </button>
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="btn-animation waves-effect waves-light btn-primary h-9 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" /> {t("users.addUser")}
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
            <div className="bg-surface p-3.5 rounded-lg border border-border-subtle/60 shadow-2xs flex items-center gap-3 transition-all hover:shadow-xs">
              <div className="w-9 h-9 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center border border-blue-500/30 shrink-0">
                <Users className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-wider">
                  {t("users.totalUser")}
                </div>
                <div className="text-lg font-medium text-content-strong leading-none mt-1">
                  {totalUsersCount}
                </div>
              </div>
            </div>
            <div className="bg-surface p-3.5 rounded-lg border border-border-subtle/60 shadow-2xs flex items-center gap-3 transition-all hover:shadow-xs">
              <div className="w-9 h-9 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-500/30 shrink-0">
                <CheckCircle className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-wider">
                  {t("users.approved")}
                </div>
                <div className="text-lg font-medium text-content-strong leading-none mt-1">
                  {approvedUsersCount}
                </div>
              </div>
            </div>
            <div className="bg-surface p-3.5 rounded-lg border border-border-subtle/60 shadow-2xs flex items-center gap-3 transition-all hover:shadow-xs">
              <div className="w-9 h-9 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center border border-amber-500/30 shrink-0">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-wider">
                  {t("users.pending")}
                </div>
                <div className="text-lg font-medium text-content-strong leading-none mt-1">
                  {pendingUsersCount}
                </div>
              </div>
            </div>
            <div className="bg-surface p-3.5 rounded-lg border border-border-subtle/60 shadow-2xs flex items-center gap-3 transition-all hover:shadow-xs">
              <div className="w-9 h-9 bg-rose-500/10 text-rose-600 rounded-lg flex items-center justify-center border border-rose-500/30 shrink-0">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-xs sm:text-[10px] font-medium text-content-subtle uppercase tracking-wider">
                  {t("users.administrator")}
                </div>
                <div className="text-lg font-medium text-content-strong leading-none mt-1">
                  {adminUsersCount}
                </div>
              </div>
            </div>
          </div>

          {/* User List */}
          <div className="bg-surface rounded-xl shadow-soft border border-border-subtle/50 overflow-hidden flex-1 flex flex-col">
            {selectedUserIds.length > 0 && (
              <div className="bg-indigo-500/10 border-b border-indigo-500/30 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-content-inverse text-xs font-medium flex items-center justify-center">
                    {selectedUserIds.length}
                  </span>
                  <span className="text-sm font-medium text-indigo-950">
                    {t("users.selectedForBulk")}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleBulkAction("approve")}
                    disabled={isBulkActionPending}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-content-inverse text-xs font-medium rounded-lg shadow-soft transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> {t("jsx.j156")}
                  </button>
                  <button
                    onClick={() => handleBulkAction("reject")}
                    disabled={isBulkActionPending}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-content-inverse text-xs font-medium rounded-lg shadow-soft transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" /> {t("users.pendingReject")}
                  </button>

                  <div className="relative inline-block text-left">
                    <StyledDropdown
                      value=""
                      disabled={isBulkActionPending}
                      onChange={(val: string) => {
                        if (val) handleBulkAction(val as AppRole);
                      }}
                      options={[
                        {
                          id: "",
                          label: t("bulkActions.changeRole"),
                          icon: "Users",
                          color: "#6366F1",
                        },
                        ...peranSistem.map((p) => ({
                          id: p.code,
                          label: p.label,
                          icon: p.icon || undefined,
                          color: p.color || undefined,
                        })),
                      ]}
                      type="project_role"
                      masterData={masterData}
                      buttonClassName="px-3.5 py-1.5 bg-surface border border-border-subtle text-xs font-medium rounded-lg shadow-2xs"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      const hasAdmins = filteredUsers.some(
                        (u) => selectedUserIds.includes(u.id) && normalkanPeran(u.role) === "admin"
                      );
                      if (hasAdmins) {
                        toast.error(t("toast.cannotBulkDeleteAdmin"));
                        return;
                      }
                      const hasSelf = selectedUserIds.includes(props.currentUserId || "");
                      if (hasSelf) {
                        toast.error(t("toast.cannotBulkDeleteSelf"));
                        return;
                      }

                      const isConfirmed = await confirmDeleteAlert(
                        t("alerts.bulkDeleteUsersTitle"),
                        t("alerts.bulkDeleteUsersText", { count: selectedUserIds.length })
                      );
                      if (!isConfirmed) return;

                      await handleBulkAction("delete");
                    }}
                    disabled={isBulkActionPending}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-content-inverse text-xs font-medium rounded-lg shadow-soft transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t("jsx.j157")}
                  </button>
                  <button
                    onClick={() => setSelectedUserIds([])}
                    disabled={isBulkActionPending}
                    className="px-3 py-1.5 bg-surface-strong hover:bg-surface-marker text-xs font-medium rounded-lg transition-all cursor-pointer"
                  >
                    {t("users.cancel")}
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto flex-1">
              <ResponsiveTable className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-surface-sunken/80 border-b border-border-faint text-xs sm:text-[11px] font-medium text-content-muted uppercase tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 text-center w-12">
                      <input
                        type="checkbox"
                        checked={
                          paginatedUsers.length > 0 &&
                          paginatedUsers.every((u) => selectedUserIds.includes(u.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newIds = [...selectedUserIds];
                            paginatedUsers.forEach((u) => {
                              if (!newIds.includes(u.id)) newIds.push(u.id);
                            });
                            setSelectedUserIds(newIds);
                          } else {
                            const paginatedIds = paginatedUsers.map((u) => u.id);
                            setSelectedUserIds(
                              selectedUserIds.filter((id) => !paginatedIds.includes(id))
                            );
                          }
                        }}
                        className="w-4 h-4 rounded text-indigo-600 border-border-subtle focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th
                      onClick={() => handleSort("name")}
                      className="py-3.5 px-4 w-60 cursor-pointer hover:bg-surface-muted/80 transition-colors select-none group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t("users.user")}</span>
                        <span className="text-xs sm:text-[10px] text-content-subtle group-hover:text-indigo-600">
                          {sortField === "name" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("department")}
                      className="py-3.5 px-4 w-60 cursor-pointer hover:bg-surface-muted/80 transition-colors select-none group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t("users.deptPosition")}</span>
                        <span className="text-xs sm:text-[10px] text-content-subtle group-hover:text-indigo-600">
                          {sortField === "department" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4 w-40">{t("users.projectsTasks")}</th>
                    <th
                      onClick={() => handleSort("role")}
                      className="py-3.5 px-4 w-28 cursor-pointer hover:bg-surface-muted/80 transition-colors select-none group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t("users.role")}</span>
                        <span className="text-xs sm:text-[10px] text-content-subtle group-hover:text-indigo-600">
                          {sortField === "role" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("status")}
                      className="py-3.5 px-4 w-28 text-center cursor-pointer hover:bg-surface-muted/80 transition-colors select-none group"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{t("users.status")}</span>
                        <span className="text-xs sm:text-[10px] text-content-subtle group-hover:text-indigo-600">
                          {sortField === "status" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4 w-28 text-center">{t("users.action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-faint/60">
                  {paginatedUsers.map((user) => {
                    const userProjectsCount = (projects || []).filter(
                      (p) =>
                        (p.members &&
                          (p.members.includes(user.id) || p.members.includes(user.uid))) ||
                        p.ownerId === user.id ||
                        p.ownerId === user.uid
                    ).length;

                    const userTasksCount = (tasks || []).filter(
                      (t) =>
                        t.assigneeId === user.id ||
                        t.assigneeId === user.uid ||
                        (t.assignees &&
                          (t.assignees.includes(user.id) || t.assignees.includes(user.uid))) ||
                        t.assigneeEmail === user?.email
                    ).length;

                    return (
                      <tr key={user.id} className="hover:bg-indigo-500/10 transition-colors group">
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds([...selectedUserIds, user.id]);
                              } else {
                                setSelectedUserIds(selectedUserIds.filter((id) => id !== user.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-border-subtle focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td
                          className="py-3.5 px-4 cursor-pointer"
                          onClick={() => {
                            if (props.onSelectUserForDetail) props.onSelectUserForDetail(user);
                          }}
                        >
                          <div className="flex items-center gap-3.5">
                            <UserAvatar user={user} className="w-9 h-9 text-sm shrink-0" />
                            <div>
                              <div className="font-medium text-content-strong text-xs group-hover:text-indigo-600 transition-colors">
                                {user?.displayName || user?.username}
                              </div>
                              <div className="text-xs sm:text-[11px] text-content-muted">
                                {user?.email || "Email tidak tersedia"}
                              </div>
                              {user.phone && (
                                <div className="text-xs sm:text-[10px] font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                                  <span>{t("users.waPhone")}</span>
                                  <span>{user.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-content-body">
                              {user.department ? getDepartmentName(user.department) : "-"}
                            </span>
                            <span className="text-xs sm:text-[10px] text-content-muted uppercase tracking-widest">
                              {user.position ? getPositionName(user.position) : "-"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs sm:text-[10px] font-medium border transition-colors",
                                  userProjectsCount > 0
                                    ? "bg-indigo-500/10 text-indigo-700 border-indigo-500/30"
                                    : "bg-surface-sunken/50 text-content-subtle border-border-faint"
                                )}
                              >
                                <Layout className="w-3 h-3 text-indigo-500" />
                                <span>
                                  {t("users.projectsCount", { count: userProjectsCount })}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs sm:text-[10px] font-medium border transition-colors",
                                  userTasksCount > 0
                                    ? "bg-violet-500/10 text-violet-700 border-violet-500/30"
                                    : "bg-surface-sunken/50 text-content-subtle border-border-faint"
                                )}
                              >
                                <CheckCircle className="w-3 h-3 text-violet-500" />
                                <span>{t("users.tasksCount", { count: userTasksCount })}</span>
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "inline-flex font-medium text-xs sm:text-[11px] sm:text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-md border",
                              normalkanPeran(user.role) === "admin"
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                : normalkanPeran(user.role) === "head"
                                  ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                                  : "bg-surface-sunken text-content-secondary border-border-subtle"
                            )}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex justify-center">
                            {user.status === "approved" ? (
                              <div
                                className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"
                                title={t("users.approved")}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </div>
                            ) : user.status === "pending" ? (
                              <div
                                className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 animate-pulse"
                                title={t("users.pending")}
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div
                                className="w-7 h-7 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500"
                                title={t("users.rejected")}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              // Cabang else sebelumnya membuka modal edit bawaan panel ini.
                              // Modal tersebut tidak pernah terbuka karena satu-satunya
                              // pemakai AdminUserPanel selalu mengirim onSelectUserForDetail,
                              // dan fungsinya sudah digantikan UserDetailView yang lebih
                              // lengkap. Modal beserta cabangnya ikut dihapus.
                              onClick={() => props.onSelectUserForDetail?.(user)}
                              className="p-1.5 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-600 hover:text-content-inverse border border-indigo-500/30 rounded-lg transition-all shadow-xs active:scale-95 cursor-pointer font-medium flex items-center justify-center gap-1"
                              title={t("users.userDetail")}
                            >
                              <UserCog className="w-3.5 h-3.5 shrink-0" />
                            </button>
                            {(() => {
                              /**
                               * #190 — dua penjaga, dan yang pertama memperbaiki
                               * penjaga yang SUDAH ADA tapi diam-diam tidak berlaku.
                               *
                               * Sebelumnya: `disabled={user.role === "admin"}`.
                               * Perbandingan itu peka huruf besar-kecil, sedangkan
                               * `types/roles.ts` mencatat data lama menyimpan campuran
                               * `Admin`/`admin`/`ADMIN` dan mewajibkan SETIAP pembanding
                               * peran lewat `normalkanPeran()` lebih dulu. Pada baris yang
                               * perannya tersimpan `Admin`, penjaga lama menghasilkan
                               * `false` — tombolnya aktif, dan dialog hapus muncul persis
                               * seperti yang dilaporkan. Penjaganya terlihat ada di kode
                               * tetapi tidak bekerja pada data yang justru paling perlu
                               * dilindungi.
                               *
                               * Penjaga kedua baru: baris akun yang SEDANG LOGIN. Barisnya
                               * berada di urutan teratas tabel, jadi salah klik pada baris
                               * pertama adalah kesalahan yang paling mungkin terjadi. Jalur
                               * hapus MASSAL sudah menolak keduanya sejak dulu
                               * (`cannotBulkDeleteAdmin`, `cannotBulkDeleteSelf`); tombol
                               * per baris ini satu-satunya yang tertinggal.
                               *
                               * `id` DAN `uid` sama-sama dibandingkan sebab keduanya dipakai
                               * sebagai identitas di repo ini, dan membandingkan salah satu
                               * saja membuat penjaganya meleset tanpa suara.
                               */
                              const adalahAdmin = normalkanPeran(user.role) === "admin";
                              const adalahAkunSendiri =
                                !!props.currentUserId &&
                                [user.id, user.uid]
                                  .filter(Boolean)
                                  .map(String)
                                  .includes(String(props.currentUserId));
                              const terkunci = adalahAdmin || adalahAkunSendiri;
                              return (
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  disabled={terkunci}
                                  className="p-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-content-inverse border border-rose-500/30 rounded-lg transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-1"
                                  // Tombol mati tanpa penjelasan terbaca sebagai aplikasi
                                  // rusak. Alasannya disebutkan di tempat kursor sudah berada.
                                  title={
                                    adalahAkunSendiri
                                      ? t("users.cannotDeleteSelf")
                                      : adalahAdmin
                                        ? t("toast.cannotDeleteAdmin")
                                        : t("users.deleteUser")
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                </button>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-content-muted">
                        {t("users.empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </ResponsiveTable>
            </div>

            {/* Enterprise DataTable Pagination & Entries Controls */}
            <div className="border-t border-border-faint p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-sunken/50 mt-auto">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-content-muted">
                  {t("common.showing")}{" "}
                  {filteredUsers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}{" "}
                  {t("common.to")} {Math.min(currentPage * itemsPerPage, filteredUsers.length)}{" "}
                  {t("common.of")} {filteredUsers.length} {t("common.entries")}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-content-muted font-medium">
                  <span>{t("users.rowsPerPage")}</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-surface border border-border-subtle rounded-md px-2 py-1 text-xs font-medium text-content-body outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg h-8 px-2.5 text-xs font-medium"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> {t("jsx.j158")}
                </Button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-medium transition-colors",
                      currentPage === i + 1
                        ? "bg-indigo-600 text-content-inverse shadow-2xs"
                        : "bg-surface border border-border-subtle text-content-secondary hover:bg-surface-sunken"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="rounded-lg h-8 px-2.5 text-xs font-medium"
                >
                  {t("jsx.j159")} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title={t("users.addNewUser")}
      >
        <div className="space-y-4">
          <div className="p-4 bg-violet-500/10 rounded-xl border border-violet-500/30 mb-2">
            <p className="text-sm font-medium text-violet-900">{t("users.userRegistration")}</p>
            <p className="text-xs text-violet-700 mt-1">{t("users.registerNew")}</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-content-subtle uppercase tracking-wider mb-1">
                {t("users.username")}
              </label>
              <Input
                value={addPeopleUsername}
                onChange={(e: any) => handleUsernameChange(e.target.value)}
                placeholder={t("users.usernamePlaceholder")}
                className={
                  usernameError
                    ? "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500"
                    : ""
                }
              />
              {usernameError && (
                <p className="text-xs sm:text-[10px] font-medium text-rose-500 mt-1">
                  {usernameError}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-content-subtle uppercase tracking-wider mb-1">
                {t("users.fullName")}
              </label>
              <Input
                value={addPeopleFullName}
                onChange={(e: any) => {
                  setAddPeopleFullName(e.target.value);
                  // #189 — pesan hilang begitu pengguna mulai memperbaikinya.
                  // Membiarkannya menetap sampai submit berikutnya membuat
                  // form terasa masih menolak padahal sudah benar.
                  if (addPeopleErrors.fullName)
                    setAddPeopleErrors((p) => ({ ...p, fullName: undefined }));
                }}
                placeholder={t("users.fullNamePlaceholder")}
                className={
                  addPeopleErrors.fullName
                    ? "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500"
                    : ""
                }
              />
              {addPeopleErrors.fullName && (
                <p className="text-xs sm:text-[10px] font-medium text-rose-500 mt-1">
                  {addPeopleErrors.fullName}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-content-subtle uppercase tracking-wider mb-1">
                {t("users.email")}
              </label>
              <Input
                value={addPeopleEmail}
                onChange={(e: any) => handleEmailChange(e.target.value)}
                placeholder={t("users.emailPlaceholder")}
                className={
                  emailError ? "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500" : ""
                }
              />
              {emailError && (
                <p className="text-xs sm:text-[10px] font-medium text-rose-500 mt-1">
                  {emailError}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-content-subtle uppercase tracking-wider mb-1">
                {t("users.phone")}
              </label>
              <Input
                value={addPeoplePhone}
                onChange={(e: any) => setAddPeoplePhone(e.target.value)}
                placeholder={t("users.phonePlaceholder")}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-subtle uppercase tracking-wider mb-1">
                {t("users.password")}
              </label>
              <Input
                type="password"
                value={addPeoplePassword}
                onChange={(e: any) => {
                  handlePasswordChange(e.target.value);
                  if (addPeopleErrors.password)
                    setAddPeopleErrors((p) => ({ ...p, password: undefined }));
                }}
                placeholder={t("users.passwordPlaceholder")}
                className={
                  addPeopleErrors.password
                    ? "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500"
                    : ""
                }
              />
              {addPeopleErrors.password && (
                <p className="text-xs sm:text-[10px] font-medium text-rose-500 mt-1">
                  {addPeopleErrors.password}
                </p>
              )}
              {passwordStrength && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-1 h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        passwordStrength === "weak"
                          ? "bg-rose-500 w-1/3"
                          : passwordStrength === "medium"
                            ? "bg-amber-500 w-2/3"
                            : "bg-emerald-500 w-full"
                      )}
                    />
                  </div>
                  <p
                    className={cn(
                      "text-xs sm:text-[10px] font-medium uppercase tracking-wider",
                      passwordStrength === "weak"
                        ? "text-rose-500"
                        : passwordStrength === "medium"
                          ? "text-amber-500"
                          : "text-emerald-500"
                    )}
                  >
                    {t("jsx.j160")}{" "}
                    {passwordStrength === "weak"
                      ? "Lemah"
                      : passwordStrength === "medium"
                        ? "Sedang"
                        : "Kuat"}
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-content-subtle uppercase tracking-wider mb-1">
                {t("users.department")}
              </label>
              <div className="relative group/select">
                <StyledDropdown
                  value={addPeopleDepartment}
                  onChange={(val: string) => setAddPeopleDepartment(val)}
                  options={[
                    { id: "", label: t("users.selectDept"), icon: "Building2", color: "#6366F1" },
                    ...masterData
                      .filter((d) => d.type === "department")
                      .map((dep) => ({
                        id: dep.id,
                        label: dep.label,
                        icon: dep.icon,
                        color: dep.color,
                      })),
                  ]}
                  type="department"
                  masterData={masterData}
                  className="w-full"
                  buttonClassName="w-full px-4 py-2 bg-surface-sunken border border-border-subtle rounded-xl text-sm font-medium"
                />
                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-content-subtle" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-content-subtle uppercase tracking-wider mb-1">
                {t("users.position")}
              </label>
              <div className="relative group/select">
                <StyledDropdown
                  value={addPeopleJabatan}
                  onChange={(val: string) => setAddPeopleJabatan(val)}
                  options={[
                    {
                      id: "",
                      label: t("users.selectPosition"),
                      icon: "BadgeCheck",
                      color: "#6366F1",
                    },
                    ...masterData
                      .filter((d) => d.type === "jabatan")
                      .map((j) => ({ id: j.id, label: j.label, icon: j.icon, color: j.color })),
                  ]}
                  type="jabatan"
                  masterData={masterData}
                  className="w-full"
                  buttonClassName="w-full px-4 py-2 bg-surface-sunken border border-border-subtle rounded-xl text-sm font-medium"
                />
                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-content-subtle" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-content-subtle uppercase tracking-wider mb-1">
                {t("users.systemRole")}
              </label>
              <div className="relative group/select">
                <StyledDropdown
                  value={addPeopleRole}
                  onChange={(val: string) => setAddPeopleRole(sebagaiPeranSistem(val))}
                  options={peranSistem.map((p) => ({
                    id: p.code,
                    label: p.label,
                    icon: p.icon || undefined,
                    color: p.color || undefined,
                  }))}
                  type="project_role"
                  masterData={masterData}
                  className="w-full"
                  buttonClassName="w-full px-4 py-2 bg-surface-sunken border border-border-subtle rounded-xl text-sm font-medium"
                />
                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-content-subtle" />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsInviteModalOpen(false)}
              className="flex-1 justify-center"
            >
              {t("users.cancel")}
            </Button>
            <Button
              onClick={handleAddPeople}
              // #189 — keempat syarat "field kosong" DIHAPUS dari sini dengan
              // sengaja. Selama mereka ada, tombolnya mati saat form kosong,
              // `onClick` tidak pernah menyala, dan penolakan di
              // `handleAddPeople` beserta pesannya tidak pernah sampai ke
              // pengguna. `usernameError`/`emailError` tetap dipertahankan:
              // keduanya SUDAH menampilkan alasannya di bawah field, jadi
              // tombol matinya tidak membingungkan.
              disabled={!!usernameError || !!emailError}
              className="flex-1 justify-center bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" /> {t("users.addPerson")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isInviteSuccessModalOpen}
        onClose={() => {
          setIsInviteSuccessModalOpen(false);
          fetchUsers();
        }}
        title={t("users.regSuccessTitle")}
      >
        <div className="space-y-6 text-center py-4">
          <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-content">{t("users.usernameRecorded")}</h3>
            <p className="text-sm text-content-muted mt-2">
              {t("jsx.k18")} <span className="font-medium text-content">{addPeopleEmail}</span>{" "}
              {t("jsx.j161")}
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin);
                toast.success(t("toast.linkCopied"));
              }}
              className="w-full justify-center py-3"
            >
              <Copy className="w-4 h-4" /> {t("jsx.j162")}
            </Button>
          </div>

          <button
            onClick={() => {
              setIsInviteSuccessModalOpen(false);
              fetchUsers();
            }}
            className="text-sm font-medium text-content-subtle hover:text-content-secondary transition-colors"
          >
            {t("users.close")}
          </button>
        </div>
      </Modal>

      {/* Senior Portal-Style Hover Tooltip overlay */}
      {hoveredTooltip && (
        <div
          className="fixed z-9999 pointer-events-none bg-overlay/95 backdrop-blur-md border border-slate-700/80 text-content-inverse text-xs font-medium rounded-xl px-3.5 py-2.5 max-w-xs shadow-2xl transition-all duration-100 ease-out animate-in fade-in zoom-in-95"
          style={{
            left: `${hoveredTooltip.x + 14}px`,
            top: `${hoveredTooltip.y + 14}px`,
            transform: "translate3d(0, 0, 0)",
          }}
        >
          <div className="flex items-start gap-2 max-w-[210px]">
            <Info className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
            <span className="leading-snug font-medium text-xs sm:text-[11px]">
              {hoveredTooltip.text}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
