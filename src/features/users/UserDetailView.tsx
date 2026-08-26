import { useTranslation } from "react-i18next";
import { StyledDropdown } from "../../components/ui/CommonComponents";
import { safeLocalStorage } from "../../lib/safeStorage";
import React, { useState, useEffect } from "react";
import { UserProfile, Project, Task, AppRole, UserPermissions, ActivityLog } from "../../types";
import { UserAvatar } from "./styles";
import {
  ArrowLeft,
  ShieldCheck,
  Award,
  UserCog,
  Users,
  Eye,
  EyeOff,
  CheckCircle,
  Layout,
  Key,
  Check,
  Clock,
  Lock,
  ShieldAlert,
  Trash2,
  Plus,
  UserPlus,
  Save,
  RefreshCw,
  Server,
  LayoutGrid,
  IdCard,
  KeyRound,
  Settings2,
  FileText,
  Paperclip,
  Activity,
  Sparkles,
  Camera,
  Mail,
  Phone,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  MapPin,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Video,
  Workflow,
  Download,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
} from "lucide-react";
import { formatDistanceToNow, isToday, isThisWeek, isThisMonth } from "date-fns";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { cn, ensureDate, humanizeActivityAction } from "../../lib/utils";
import { apiRequest } from "../../lib/api";
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
import { ForgotPasswordModal } from "../auth/components/ForgotPasswordModal";
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
  activityLogs?: ActivityLog[];
}

/**
 * Item #148 — label dan deskripsi modul kini KUNCI kamus, bukan teks.
 *
 * Konstanta ini berada di tingkat modul sehingga tidak bisa memakai hook,
 * dan `i18n.t()` di sini akan dievaluasi sekali saat impor — membekukan
 * bahasanya. Jadi yang disimpan adalah kunci; penerjemahannya dilakukan di
 * tempat pemakaian, yang memang berada di dalam komponen.
 */
const MODULE_DESCRIPTIONS: Record<string, { label: string; desc: string }> = {
  dashboard: { label: "permModul.dashboardLabel", desc: "permModul.dashboardDesc" },
  meetingNotes: { label: "permModul.meetingNotesLabel", desc: "permModul.meetingNotesDesc" },
  wiki: { label: "permModul.wikiLabel", desc: "permModul.wikiDesc" },
  flowchart: { label: "permModul.flowchartLabel", desc: "permModul.flowchartDesc" },
  list: { label: "permModul.listLabel", desc: "permModul.listDesc" },
  sprints: { label: "permModul.sprintsLabel", desc: "permModul.sprintsDesc" },
  board: { label: "permModul.boardLabel", desc: "permModul.boardDesc" },
  qa: { label: "permModul.qaLabel", desc: "permModul.qaDesc" },
  timeline: { label: "permModul.timelineLabel", desc: "permModul.timelineDesc" },
  access: { label: "permModul.accessLabel", desc: "permModul.accessDesc" },
  masterData: { label: "permModul.masterDataLabel", desc: "permModul.masterDataDesc" },
  userManagement: { label: "permModul.userManagementLabel", desc: "permModul.userManagementDesc" },
  auditLog: { label: "permModul.auditLogLabel", desc: "permModul.auditLogDesc" },
  dbExplorer: { label: "permModul.dbExplorerLabel", desc: "permModul.dbExplorerDesc" },
  settings: { label: "permModul.settingsLabel", desc: "permModul.settingsDesc" },
};

/** Struktur Grup Modul Persis Mengikuti Sidebar Aplikasi */
interface PermissionSection {
  id: string;
  titleKey: string;
  modules: Array<keyof UserPermissions>;
}

const PERMISSION_SECTIONS: PermissionSection[] = [
  {
    id: "menu",
    titleKey: "sidebar.menu",
    modules: ["dashboard"],
  },
  {
    id: "collaboration",
    titleKey: "sidebar.collaboration",
    modules: ["meetingNotes", "wiki", "flowchart"],
  },
  {
    id: "projects",
    titleKey: "sidebar.projectManagement",
    modules: ["list", "sprints", "board", "qa", "timeline", "access"],
  },
  {
    id: "administration",
    titleKey: "sidebar.administration",
    modules: ["masterData", "userManagement", "auditLog", "dbExplorer", "settings"],
  },
];

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
  activityLogs = [],
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

  const curId = effectiveCurrentUser?.id || effectiveCurrentUser?.uid;
  const isSelf = Boolean(
    curId &&
    (curId === user?.id ||
      curId === user?.uid ||
      (effectiveCurrentUser?.email && effectiveCurrentUser.email === user?.email))
  );

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
  const [selectedCover, setSelectedCover] = useState<File | null>(null);
  const [previewCoverUrl, setPreviewCoverUrl] = useState<string | null>(null);
  const [coverURL, setCoverURL] = useState<string>(() => {
    return safeLocalStorage.getItem(`user_cover_${user?.id || user?.uid}`) || "";
  });
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

  // State lipat/buka tugas per proyek di Tab Project
  const [expandedProjectTasks, setExpandedProjectTasks] = useState<Record<string, boolean>>({});
  const toggleProjectTasks = (projectId: string) => {
    setExpandedProjectTasks((prev) => ({
      ...prev,
      [projectId]: prev[projectId] === undefined ? false : !prev[projectId],
    }));
  };

  // Password State (Old, New, Confirm)
  const [editOldPassword, setEditOldPassword] = useState<string>("");
  const [editPassword, setEditPassword] = useState<string>("");
  const [editConfirmPassword, setEditConfirmPassword] = useState<string>("");
  const [showOldPassword, setShowOldPassword] = useState<boolean>(false);
  const [showEditPassword, setShowEditPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Login Sessions State (Real interactive tracking per user)
  interface SessionItem {
    id: string;
    device: string;
    deviceType: "laptop" | "smartphone" | "tablet";
    location: string;
    ip: string;
    time: string;
    isCurrent: boolean;
  }

  const [userSessions, setUserSessions] = useState<SessionItem[]>(() => {
    const uId = user?.id || user?.uid || "current";
    const saved = safeLocalStorage.getItem(`user_sessions_${uId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }

    // Deteksi browser / OS nyata pengguna saat ini
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    let detectedBrowser = "Browser";
    if (ua.includes("Chrome") && !ua.includes("Edg")) detectedBrowser = "Chrome";
    else if (ua.includes("Edg")) detectedBrowser = "Edge";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) detectedBrowser = "Safari";
    else if (ua.includes("Firefox")) detectedBrowser = "Firefox";

    let detectedOS = "PC";
    let isMobile = false;
    let isTablet = false;
    if (ua.includes("Windows")) detectedOS = "Windows";
    else if (ua.includes("Macintosh")) detectedOS = "macOS";
    else if (ua.includes("iPhone")) {
      detectedOS = "iPhone";
      isMobile = true;
    } else if (ua.includes("Android")) {
      detectedOS = "Android";
      isMobile = true;
    } else if (ua.includes("iPad")) {
      detectedOS = "iPad";
      isTablet = true;
    } else if (ua.includes("Linux")) detectedOS = "Linux";

    // Deteksi nama kota spesifik berdasarkan TimeZone sistem pengguna nyata
    let detectedCity = "Jakarta, Indonesia";
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("/")) {
        const parts = tz.split("/");
        const cityPart = parts[parts.length - 1].replace(/_/g, " ");
        const regionPart = parts[0];
        if (tz === "Asia/Jakarta") detectedCity = "Jakarta, Indonesia";
        else if (tz === "Asia/Pontianak") detectedCity = "Pontianak, Indonesia";
        else if (tz === "Asia/Makassar") detectedCity = "Makassar, Indonesia";
        else if (tz === "Asia/Jayapura") detectedCity = "Jayapura, Indonesia";
        else if (tz === "Asia/Singapore") detectedCity = "Singapore";
        else if (tz === "Asia/Kuala_Lumpur") detectedCity = "Kuala Lumpur, Malaysia";
        else if (regionPart === "Asia") detectedCity = `${cityPart}, Asia`;
        else detectedCity = `${cityPart}, ${regionPart}`;
      }
    } catch {}

    const currentSession: SessionItem = {
      id: "s-current",
      device: `${detectedBrowser} on ${detectedOS}`,
      deviceType: isMobile ? "smartphone" : isTablet ? "tablet" : "laptop",
      location: detectedCity,
      ip: "127.0.0.1 (Local)",
      time: "Active Now",
      isCurrent: true,
    };

    const initialSessions: SessionItem[] = [currentSession];
    safeLocalStorage.setItem(`user_sessions_${uId}`, JSON.stringify(initialSessions));
    return initialSessions;
  });

  // Item #187 — Real GPS Device Geolocation + Reverse Geocode (Bogor/lokasi fisik nyata) dengan IP Fallback
  useEffect(() => {
    let isMounted = true;

    const updateSessionLocation = (realLocation: string, realIp?: string) => {
      if (!isMounted) return;
      setUserSessions((prev) => {
        const updated = prev.map((s) =>
          s.isCurrent
            ? {
                ...s,
                location: realLocation,
                ip: realIp || s.ip || "127.0.0.1",
              }
            : s
        );
        const uId = user?.id || user?.uid || "current";
        safeLocalStorage.setItem(`user_sessions_${uId}`, JSON.stringify(updated));
        return updated;
      });
    };

    const fetchGpsLocation = () => {
      if (typeof navigator !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
              // Reverse Geocoding via OpenStreetMap Nominatim
              const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
                { headers: { "Accept-Language": "id,en" } }
              ).then((r) => r.json());

              if (geoRes && geoRes.address && isMounted) {
                const addr = geoRes.address;
                const cityName =
                  addr.city ||
                  addr.town ||
                  addr.municipality ||
                  addr.regency ||
                  addr.county ||
                  addr.state_district ||
                  addr.state ||
                  "Bogor";
                const countryName = addr.country || "Indonesia";
                const preciseLocation = `${cityName}, ${countryName}`;
                updateSessionLocation(preciseLocation);
              }
            } catch {
              // Fallback BigDataCloud client-side reverse geocode
              try {
                const bdcRes = await fetch(
                  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=id`
                ).then((r) => r.json());
                if (bdcRes && bdcRes.city && isMounted) {
                  const preciseLocation = `${bdcRes.city || bdcRes.locality}, ${bdcRes.countryName || "Indonesia"}`;
                  updateSessionLocation(preciseLocation);
                }
              } catch {}
            }
          },
          () => {
            // Pengguna menolak izin GPS atau timeout -> IP fallback
          },
          { timeout: 8000, enableHighAccuracy: true }
        );
      }
    };

    const fetchRealGeoLocation = async () => {
      // 1. Ambil IPv4 publik bersih pengguna (angka standar, bukan IPv6 panjang)
      let detectedIp = "";
      try {
        const ip4Res = await fetch("https://api4.ipify.org?format=json").then((r) => r.json());
        if (ip4Res && ip4Res.ip && isMounted) {
          detectedIp = ip4Res.ip;
        }
      } catch {}

      try {
        const res = await fetch("https://ipwho.is/").then((r) => r.json());
        if (res && res.success !== false && isMounted) {
          if (!detectedIp) detectedIp = res.ip || "";
          const fallbackLoc = `${res.city || "Bogor"}, ${res.country || "Indonesia"}`;
          updateSessionLocation(fallbackLoc, detectedIp);
        }
      } catch {
        try {
          const res2 = await fetch("https://ipapi.co/json/").then((r) => r.json());
          if (res2 && res2.city && isMounted) {
            if (!detectedIp) detectedIp = res2.ip || "";
            const fallbackLoc = `${res2.city || "Bogor"}, ${res2.country_name || "Indonesia"}`;
            updateSessionLocation(fallbackLoc, detectedIp);
          }
        } catch {
          if (detectedIp) {
            updateSessionLocation("Bogor, Indonesia", detectedIp);
          }
        }
      }

      // 2. Minta koordinat GPS fisik nyata perangkat (Tajurhalang/Bogor)
      fetchGpsLocation();
    };

    fetchRealGeoLocation();
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.uid]);

  const handleRevokeSession = (sessionId: string) => {
    const updated = userSessions.filter((s) => s.id !== sessionId);
    setUserSessions(updated);
    const uId = user?.id || user?.uid || "current";
    safeLocalStorage.setItem(`user_sessions_${uId}`, JSON.stringify(updated));
    toast.success(t("userDetail.deviceLoggedOut"));
  };

  const handleRevokeAllOtherSessions = () => {
    const currentOnly = userSessions.filter((s) => s.isCurrent);
    setUserSessions(currentOnly);
    const uId = user?.id || user?.uid || "current";
    safeLocalStorage.setItem(`user_sessions_${uId}`, JSON.stringify(currentOnly));
    toast.success(t("userDetail.allLoggedOutSuccess"));
  };

  // Accordion Section Open State for Settings Tab
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    menu: true,
    collaboration: true,
    projects: true,
    administration: true,
  });

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Handler toggle izin cerdas dengan aturan Read Dependency:
  // - Bila Read dimatikan (false), otomatis Create, Update, Delete juga dimatikan.
  // - Bila Create, Update, atau Delete diaktifkan (true), otomatis Read ikut diaktifkan.
  const handleTogglePermission = (
    module: keyof UserPermissions,
    action: "read" | "create" | "update" | "delete"
  ) => {
    setEditPermissions((prev) => {
      const currentModulePerm = prev[module] || {
        read: false,
        create: false,
        update: false,
        delete: false,
      };
      const currentVal = !!currentModulePerm[action];
      const nextVal = !currentVal;

      let updatedModulePerm = { ...currentModulePerm, [action]: nextVal };

      if (action === "read" && !nextVal) {
        // Read dimatikan -> seluruh akses modul gugur
        updatedModulePerm = { read: false, create: false, update: false, delete: false };
      } else if (action !== "read" && nextVal) {
        // Create/Update/Delete diaktifkan -> wajib Read aktif
        updatedModulePerm = { ...updatedModulePerm, read: true };
      }

      return {
        ...prev,
        [module]: updatedModulePerm,
      };
    });
  };

  // Clean up object URLs on unmount or preview changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      if (previewCoverUrl && previewCoverUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewCoverUrl);
      }
    };
  }, [previewUrl, previewCoverUrl]);

  // System Permissions Matrix State
  const [editPermissions, setEditPermissions] = useState<UserPermissions>(() => {
    return getUserPermissions(user.role || "user", user.permissions);
  });

  // Item #187 — koreksi pemilik proyek: di Velzon, "lihat profil" dan
  // "edit profil" adalah DUA layar berbeda, bukan satu form yang selalu
  // menampilkan field sunting. Klik "detail" membuka mode LIHAT bersih
  // (Overview / Project / Document, baca-saja, tombol "Edit Profile").
  // Baru setelah tombol itu diklik, layar pindah ke mode EDIT bertab
  // (Personal Detail / Change Password / Project / Settings).
  type PageMode = "view" | "edit";
  const [pageMode, setPageMode] = useState<PageMode>("view");

  type ViewTab = "overview" | "project" | "document";
  type EditTab = "personal" | "password" | "project" | "settings";
  type DetailTab = ViewTab | EditTab;
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  const enterEditMode = () => {
    setPageMode("edit");
    setActiveTab("personal");
  };
  const exitEditMode = () => {
    setPageMode("view");
    setActiveTab("overview");
  };

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
      // Item #155 — tombol mata ikut tertutup tiap form disetel ulang, supaya
      // sandi pengguna BERIKUTNYA tidak terbuka gara-gara pilihan sebelumnya.
      setShowEditPassword(false);
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

  const userId = user.id || user.uid;

  // Item #187 — Ambil data meetings dan documents/flowcharts dari backend API
  const [remoteMeetings, setRemoteMeetings] = useState<any[]>([]);
  const [remoteDocuments, setRemoteDocuments] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchRemoteData = async () => {
      try {
        const meetingPromises = (projects || []).map((p) =>
          apiRequest(`/api/projects/${p.id}/meetings`, { headers: { "x-user-id": userId } })
            .then((res: any) =>
              res?.status === "success" && Array.isArray(res?.data) ? res.data : []
            )
            .catch(() => [])
        );
        const docPromises = (projects || []).map((p) =>
          apiRequest(`/api/projects/${p.id}/documents`, { headers: { "x-user-id": userId } })
            .then((res: any) =>
              res?.status === "success" && Array.isArray(res?.data) ? res.data : []
            )
            .catch(() => [])
        );

        const [allM, allD] = await Promise.all([
          Promise.all(meetingPromises),
          Promise.all(docPromises),
        ]);

        if (isMounted) {
          setRemoteMeetings(allM.flat());
          setRemoteDocuments(allD.flat());
        }
      } catch (err) {
        console.error("Error fetching remote created items:", err);
      }
    };

    fetchRemoteData();
    return () => {
      isMounted = false;
    };
  }, [projects, userId]);

  // Item #187 — tab Document: dokumen sungguhan dari Task attachments,
  // remoteDocuments, flowchart diagrams, dan berkas milik pengguna ini.
  interface UserDocumentFile {
    id: string;
    name: string;
    url: string;
    type: string;
    size?: string;
    createdAt: any;
    taskTitle?: string;
  }

  const userDocuments = React.useMemo<UserDocumentFile[]>(() => {
    const docs: UserDocumentFile[] = [];
    const seenUrls = new Set<string>();

    const isMatchUser = (author?: string) => {
      if (!author) return false;
      const target = author.trim().toLowerCase();
      return (
        target ===
          String(userId || "")
            .trim()
            .toLowerCase() ||
        target ===
          String(user.uid || "")
            .trim()
            .toLowerCase() ||
        target ===
          String(user.id || "")
            .trim()
            .toLowerCase() ||
        target ===
          String(user.email || "")
            .trim()
            .toLowerCase()
      );
    };

    // 1. Lampiran dari tugas
    (tasks || []).forEach((t) => {
      (t.attachments || []).forEach((a) => {
        if (
          a.uploadedByUserId === userId ||
          a.uploadedByUserId === user.uid ||
          (a.uploadedByName && isMatchUser(a.uploadedByName))
        ) {
          const key = a.url || a.id || a.name;
          if (!seenUrls.has(key)) {
            seenUrls.add(key);
            docs.push({
              id: a.id || `att-${Math.random()}`,
              name: a.name || "Attachment Document",
              url: a.url,
              type: a.type || "file",
              size: (a as any).size || (a as any).fileSize || "1.25 MB",
              createdAt: a.createdAt || t.createdAt,
              taskTitle: t.title,
            });
          }
        }
      });
    });

    // 2. Dokumen dari Remote API (Docs & Flowcharts)
    remoteDocuments.forEach((doc) => {
      if (isMatchUser(doc.createdBy) || isMatchUser(doc.author) || isMatchUser(doc.userId)) {
        const isFlowchart = doc.type === "flowchart" || doc.category === "flowchart";
        const key = doc.url || doc.id || doc.name;
        if (!seenUrls.has(key)) {
          seenUrls.add(key);
          docs.push({
            id: `rdoc-${doc.id}`,
            name:
              doc.title ||
              doc.name ||
              (isFlowchart ? "Flowchart Diagram.fc" : "Project Document.pdf"),
            url: doc.url || doc.fileUrl || doc.downloadUrl || "#",
            type: isFlowchart ? "flowchart" : doc.type || "pdf",
            size: doc.size || doc.fileSize || "3.40 MB",
            createdAt: doc.createdAt || doc.updatedAt,
            taskTitle: (projects || []).find((p) => p.id === doc.projectId)?.name || "Project Doc",
          });
        }
      }
    });

    return docs.sort(
      (a, b) => ensureDate(b.createdAt).getTime() - ensureDate(a.createdAt).getTime()
    );
  }, [tasks, remoteDocuments, userId, user.uid, user.id, user.email, projects]);

  // Item #187 — panel "Team": rekan yang berbagi proyek AKTIF dengan pengguna
  // ini, dihitung dari `memberRoles` proyek yang sama, bukan daftar saran
  // acak ala "Suggestions" di Velzon.
  const teammates = React.useMemo(() => {
    const ids = new Set<string>();
    userProjectsList.forEach((p) => {
      Object.keys(p.memberRoles || {}).forEach((id) => {
        if (id !== userId && id !== user.uid) ids.add(id);
      });
      (p.members || []).forEach((id) => {
        if (id !== userId && id !== user.uid) ids.add(id);
      });
    });
    return availableUsers.filter((u) => ids.has(u.id) || ids.has(u.uid));
  }, [userProjectsList, availableUsers, userId, user.uid]);

  // Item #195 — panel "Recent Activity" sebelumnya HANYA membaca
  // `ActivityLogs` (task di project yang sedang aktif) — aksi manajemen-user
  // (admin mengedit department/role/dll, atau pengguna mengedit profil
  // sendiri) tidak pernah dicatat ke mana pun, jadi pengguna yang baru
  // diperbarui datanya tetap melihat "belum ada aktivitas". Ditambal dengan
  // membaca `AuditLogs` (tabel global yang sudah dipakai fitur "Audit
  // Perusahaan") untuk entitas User ini, digabung ke feed yang sama.
  const [userAuditLogs, setUserAuditLogs] = useState<any[]>([]);
  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    apiRequest(`/api/audit-logs?entityName=User&entityId=${userId}&limit=20`)
      .then((res: any) => {
        if (isMounted && res?.status === "success" && Array.isArray(res.data)) {
          setUserAuditLogs(res.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const userAuditActivityLogs = React.useMemo(() => {
    return userAuditLogs.map((row: any) => {
      const isSelf = row.userId === userId || row.userId === user.uid;
      const aktor = isSelf
        ? t("userDetail.actorSelf")
        : row.userName || t("userDetail.actorSomeone");
      const changedFields =
        row.newValues && row.oldValues && typeof row.newValues === "object"
          ? Object.keys(row.newValues).filter(
              (k) =>
                row.newValues[k] !== undefined &&
                JSON.stringify(row.oldValues[k]) !== JSON.stringify(row.newValues[k])
            )
          : [];
      const details =
        row.actionType === "DELETE"
          ? t("userDetail.auditDeleted", { aktor })
          : changedFields.length > 0
            ? t("userDetail.auditUpdated", { aktor, fields: changedFields.join(", ") })
            : t("userDetail.auditUpdatedNoFields", { aktor });

      return {
        id: `audit-${row.id}`,
        createdAt: row.createdAt,
        userId,
        action: row.actionType === "DELETE" ? "user_deleted" : "user_profile_updated",
        details,
      };
    });
  }, [userAuditLogs, userId, user.uid, t]);

  // Item #187 — koreksi pemilik proyek: "Recent Activity" (pengganti
  // banner statis Velzon) dan filter Today/Weekly/Monthly diisi dari
  // `ActivityLog` sungguhan (src/types/task.ts), bukan data karangan.
  const [activityFilter, setActivityFilter] = useState<"today" | "week" | "month">("today");
  const userActivityLogsAll = React.useMemo(() => {
    const taskLogs = (activityLogs || []).filter(
      (log) => log.userId === userId || log.userId === user.uid
    );
    return [...taskLogs, ...userAuditActivityLogs].sort(
      (a, b) => ensureDate(b.createdAt).getTime() - ensureDate(a.createdAt).getTime()
    );
  }, [activityLogs, userAuditActivityLogs, userId, user.uid]);
  const userActivityLogsFiltered = React.useMemo(() => {
    return userActivityLogsAll.filter((log) => {
      const d = ensureDate(log.createdAt);
      if (activityFilter === "today") return isToday(d);
      if (activityFilter === "week") return isThisWeek(d, { weekStartsOn: 1 });
      return isThisMonth(d);
    });
  }, [userActivityLogsAll, activityFilter]);

  // Item #187 — Recently Created Items lintas modul (Task, Meeting, Flowchart, Document)
  // yang DIBUAT/dilaporkan oleh pengguna ini secara nyata.
  interface UserCreatedItem {
    id: string;
    type: "task" | "meeting" | "flowchart" | "doc";
    title: string;
    subtitle?: string;
    status?: string;
    createdAt: any;
    icon: React.ComponentType<{ className?: string }>;
  }

  const userCreatedItems = React.useMemo<UserCreatedItem[]>(() => {
    const items: UserCreatedItem[] = [];
    const seenIds = new Set<string>();

    const isMatchUser = (author?: string) => {
      if (!author) return false;
      const target = author.trim().toLowerCase();
      return (
        target ===
          String(userId || "")
            .trim()
            .toLowerCase() ||
        target ===
          String(user.uid || "")
            .trim()
            .toLowerCase() ||
        target ===
          String(user.id || "")
            .trim()
            .toLowerCase() ||
        target ===
          String(user.email || "")
            .trim()
            .toLowerCase() ||
        target ===
          String(user.username || "")
            .trim()
            .toLowerCase() ||
        target ===
          String(user.displayName || "")
            .trim()
            .toLowerCase()
      );
    };

    // 1. Tugas / Issue yang dibuat pengguna
    (tasks || []).forEach((t) => {
      if (isMatchUser(t.reporterId) || isMatchUser((t as any).createdBy)) {
        const id = `task-${t.id}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          items.push({
            id,
            type: "task",
            title: t.title,
            subtitle: t.key || "TASK",
            status: t.status || "todo",
            createdAt: t.createdAt,
            icon: Layout,
          });
        }
      }
    });

    // 2. Meeting Notes yang dibuat pengguna (Backend API + Storage fallback)
    remoteMeetings.forEach((m) => {
      if (isMatchUser(m.authorId) || isMatchUser(m.author) || isMatchUser(m.createdBy)) {
        const id = `meeting-${m.id || m._id}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          items.push({
            id,
            type: "meeting",
            title: m.title || "Meeting Note",
            subtitle: (projects || []).find((p) => p.id === m.projectId)?.name || "Project Meeting",
            status: m.status || "completed",
            createdAt: m.createdAt || m.date,
            icon: Video,
          });
        }
      }
    });

    try {
      (projects || []).forEach((p) => {
        const meetingRaw = safeLocalStorage.getItem(`meetings_${p.id}`);
        if (meetingRaw) {
          const parsed = JSON.parse(meetingRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach((m: any) => {
              if (isMatchUser(m.authorId) || isMatchUser(m.author) || isMatchUser(m.createdBy)) {
                const id = `meeting-${m.id || m._id || Math.random()}`;
                if (!seenIds.has(id)) {
                  seenIds.add(id);
                  items.push({
                    id,
                    type: "meeting",
                    title: m.title || "Meeting Note",
                    subtitle: p.name || "Project Meeting",
                    status: m.status || "completed",
                    createdAt: m.createdAt || m.date,
                    icon: Video,
                  });
                }
              }
            });
          }
        }
      });
    } catch {}

    // 3. Flowchart Diagrams & Documents dari Backend API + Storage
    remoteDocuments.forEach((doc) => {
      if (isMatchUser(doc.createdBy) || isMatchUser(doc.author) || isMatchUser(doc.userId)) {
        const isFlowchart = doc.type === "flowchart" || doc.category === "flowchart";
        const id = `doc-${doc.id}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          items.push({
            id,
            type: isFlowchart ? "flowchart" : "doc",
            title: doc.title || doc.name || (isFlowchart ? "Flowchart Diagram" : "Document"),
            subtitle:
              (projects || []).find((p) => p.id === doc.projectId)?.name ||
              (isFlowchart ? "Diagram" : "Document"),
            status: isFlowchart ? "diagram" : doc.type || "file",
            createdAt: doc.createdAt || doc.updatedAt,
            icon: isFlowchart ? Workflow : FileText,
          });
        }
      }
    });

    try {
      (projects || []).forEach((p) => {
        const fcRaw = safeLocalStorage.getItem(`flowcharts_${p.id}`);
        if (fcRaw) {
          const parsed = JSON.parse(fcRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach((fc: any) => {
              if (isMatchUser(fc.createdBy) || isMatchUser(fc.author)) {
                const id = `fc-${fc.id || Math.random()}`;
                if (!seenIds.has(id)) {
                  seenIds.add(id);
                  items.push({
                    id,
                    type: "flowchart",
                    title: fc.name || "Flowchart Diagram",
                    subtitle: p.name || "Diagram",
                    status: "diagram",
                    createdAt: fc.createdAt || fc.updatedAt,
                    icon: Workflow,
                  });
                }
              }
            });
          }
        }
      });
    } catch {}

    // 4. Dokumen / Berkas Lampiran yang diunggah pengguna
    userDocuments.forEach((doc) => {
      const id = `doc-${doc.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        items.push({
          id,
          type: "doc",
          title: doc.name,
          subtitle: doc.taskTitle,
          status: doc.type || "file",
          createdAt: doc.createdAt,
          icon: FileText,
        });
      }
    });

    return items
      .sort((a, b) => ensureDate(b.createdAt).getTime() - ensureDate(a.createdAt).getTime())
      .slice(0, 15);
  }, [tasks, projects, remoteMeetings, remoteDocuments, userId, user, userDocuments]);

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

  // Item #156 · §19.8 Tahap 6 — `handleTogglePermission` dan
  // `handleResetToRoleDefaults` DIHAPUS bersama panelnya. Keduanya hanya
  // menyunting `editPermissions`, dan matriksnya kini baca-saja.
  //
  // `editPermissions` sendiri SENGAJA dipertahankan: nilainya masih dibaca
  // untuk menggambar matriks, masih ikut berubah saat peran diganti (baris
  // di dropdown peran), dan masih dikirim saat simpan — sehingga penimpaan
  // `list` yang sudah ada di database tidak terhapus diam-diam.

  // Handler Input File (Local Preview Only - Deferred Upload)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("toast.avatarFormatUnsupported"));
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error(t("toast.fileMax2MB"));
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

  // Handler Input Cover File
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("toast.avatarFormatUnsupported"));
      return;
    }

    const maxSize = 3 * 1024 * 1024; // 3MB
    if (file.size > maxSize) {
      toast.error(t("toast.fileMax2MB"));
      return;
    }

    if (previewCoverUrl && previewCoverUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewCoverUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedCover(file);
    setPreviewCoverUrl(objectUrl);
    // Simpan data uri preview ke storage
    const reader = new FileReader();
    reader.onload = (re) => {
      const dataUri = re.target?.result as string;
      if (dataUri) {
        setCoverURL(dataUri);
        safeLocalStorage.setItem(`user_cover_${user?.id || user?.uid}`, dataUri);
        toast.success(t("userDetail.coverUpdated"));
      }
    };
    reader.readAsDataURL(file);
  };

  // Handler Submit Utama (Simpan Perubahan User)
  const handleSaveUser = async () => {
    if (!editFullName.trim()) {
      toast.error(t("toast.fullNameRequired"));
      return;
    }

    if (editPassword.trim() && editConfirmPassword.trim() && editPassword !== editConfirmPassword) {
      toast.error(t("userDetail.passwordMismatch"));
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
        toast.success(t("toast.userPermissionsUpdated", { nama: editFullName }));
        setEditOldPassword("");
        setEditPassword("");
        setEditConfirmPassword("");
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
      toast.error(t("toast.pickProjectFirst"));
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

      toast.success(t("toast.userAssignedProject", { proyek: p.name }));
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
      toast.error(t("toast.assignProjectFailed") + (e.message || e));
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

      toast.success(t("toast.userRemovedProject", { proyek: p.name }));

      setUserProjectsList((prev) => prev.filter((proj) => proj.id !== projectId));

      if (onUserUpdated) onUserUpdated();
    } catch (e: any) {
      toast.error(t("toast.removeProjectFailed") + (e.message || e));
    }
  };

  // Item #187 — Helper identifikasi tipe file, ikon berwarna, dan label ala Velzon
  const getFileDisplayInfo = (name: string, type?: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || (type || "").toLowerCase();

    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
      return {
        icon: FileArchive,
        bgColor: "bg-blue-500/10 text-blue-600 border border-blue-500/20",
        typeLabel: "Zip File",
      };
    }
    if (["pdf"].includes(ext)) {
      return {
        icon: FileText,
        bgColor: "bg-rose-500/10 text-rose-600 border border-rose-500/20",
        typeLabel: "PDF File",
      };
    }
    if (["mp4", "mkv", "avi", "mov", "webm", "video"].includes(ext)) {
      return {
        icon: Video,
        bgColor: "bg-sky-500/10 text-sky-600 border border-sky-500/20",
        typeLabel: "MP4 File",
      };
    }
    if (["xls", "xlsx", "csv", "sheet"].includes(ext)) {
      return {
        icon: FileSpreadsheet,
        bgColor: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
        typeLabel: "XSL File",
      };
    }
    if (["png", "jpg", "jpeg", "webp", "gif", "svg", "image"].includes(ext)) {
      return {
        icon: ImageIcon,
        bgColor: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
        typeLabel: "PNG File",
      };
    }
    if (["fc", "flowchart", "diagram"].includes(ext)) {
      return {
        icon: Workflow,
        bgColor: "bg-cyan-500/10 text-cyan-600 border border-cyan-500/20",
        typeLabel: "Folder File",
      };
    }
    return {
      icon: FileText,
      bgColor: "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20",
      typeLabel: "Doc File",
    };
  };

  const [docDisplayLimit, setDocDisplayLimit] = useState<number>(6);

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditPassword(pass);
    navigator.clipboard.writeText(pass);
    toast.success(t("toast.randomPasswordCreated", { sandi: pass }));
  };

  // Item #187 — koreksi pemilik proyek: kartu proyek ala Velzon (aksen
  // border kiri berwarna + badge status + avatar anggota). Warnanya
  // heuristik presentasi dari `status` SUNGGUHAN (MasterData project_status),
  // bukan data karangan — hanya pemetaan kata kunci ke warna yang sudah
  // dipakai di tempat lain pada berkas ini (editStatus, dst).
  const projectStatusStyle = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("done") || s.includes("complete") || s.includes("selesai")) {
      return {
        border: "border-l-emerald-500",
        badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
      };
    }
    if (s.includes("hold") || s.includes("pending") || s.includes("tunda")) {
      return {
        border: "border-l-amber-500",
        badge: "bg-amber-500/10 text-amber-700 border-amber-500/30",
      };
    }
    if (s.includes("cancel") || s.includes("archive") || s.includes("batal")) {
      return {
        border: "border-l-rose-500",
        badge: "bg-rose-500/10 text-rose-700 border-rose-500/30",
      };
    }
    if (!s) {
      return {
        border: "border-l-border-subtle",
        badge: "bg-surface-muted text-content-secondary border-border-subtle",
      };
    }
    return {
      border: "border-l-indigo-500",
      badge: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30",
    };
  };
  const projectMemberAvatars = (p: Project) => {
    const ids = p.members || Object.keys(p.memberRoles || {});
    return ids
      .map((id) => availableUsers.find((u) => u.id === id || u.uid === id))
      .filter(Boolean) as any[];
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-sunken overflow-y-auto p-3 md:p-6 pb-24 md:pb-32">
      <div className="flex flex-col space-y-5 min-h-full animate-in fade-in duration-700">
        {/* Main Content Area */}
        <div className="w-full space-y-5 flex-1">
          {/* Cover-nya dekoratif (gradien), BUKAN foto per-pengguna — LanPro
              tidak punya kolom cover photo, dan mengarang foto acak akan
              melanggar aturan anti-halusinasi repo ini. Tombol aksi (Back,
              Edit Profile / Save) ada di pojok cover, persis posisi Velzon. */}
          <div className="bg-surface rounded-lg shadow-xs border border-border-subtle overflow-hidden">
            <div
              className="h-32 sm:h-44 w-full bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 relative bg-cover bg-center transition-all"
              style={
                previewCoverUrl || coverURL
                  ? { backgroundImage: `url(${previewCoverUrl || coverURL})` }
                  : undefined
              }
            >
              {/* Overlay tipis agar teks & tombol di atas cover tetap berjarak kontras */}
              {(previewCoverUrl || coverURL) && (
                <div className="absolute inset-0 bg-surface-sunken/40" />
              )}

              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                {/* Tombol Change Cover ala Velzon - Kontras Solid */}
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-surface/90 hover:bg-surface text-content-strong border border-border-subtle rounded-md text-xs font-semibold shadow-sm backdrop-blur-md transition cursor-pointer">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{t("userDetail.changeCover")}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleCoverChange}
                  />
                </label>

                <button
                  onClick={pageMode === "edit" ? exitEditMode : onBack}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface/90 hover:bg-surface text-content-strong border border-border-subtle rounded-md text-xs font-semibold shadow-sm backdrop-blur-md transition cursor-pointer"
                  title={t("userDetail.back")}
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-content-muted" />
                  <span>{t("userDetail.back")}</span>
                </button>

                {pageMode === "view" && (isAdmin || isSelf) && (
                  <button
                    onClick={enterEditMode}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-content-inverse rounded-md text-xs font-medium shadow-soft transition cursor-pointer"
                  >
                    <UserCog className="w-3.5 h-3.5" />
                    <span>{t("userDetail.editProfile")}</span>
                  </button>
                )}
                {pageMode === "edit" && (
                  <button
                    onClick={handleSaveUser}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-content-inverse rounded-md text-xs font-medium shadow-soft transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{t("userDetail.saveUserChanges")}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative group cursor-pointer shrink-0 z-10 -mt-10 sm:-mt-12">
                  <UserAvatar
                    user={{ ...user, photoURL: previewUrl || photoURL } as any}
                    className="w-20 h-20 sm:w-24 sm:h-24 text-2xl shadow-soft border-4 border-surface shrink-0"
                  />
                  {previewUrl && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-amber-500 text-content-inverse text-xs sm:text-[11px] sm:text-[9px] font-semibold px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap z-20">
                      {t("userDetail.preview")}
                    </span>
                  )}
                  {pageMode === "edit" && (
                    <label className="absolute inset-0 bg-black/50 text-content-inverse rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity border-4 border-surface ">
                      <Camera className="w-6 h-6" />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>

                <div className="flex-1 pt-2 sm:pt-3">
                  <h2 className="text-xl font-semibold text-content-strong">
                    {user.displayName || user.username}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {editPosition && (
                      <span className="text-xs font-medium text-content-body">
                        {getPosName(editPosition)}
                      </span>
                    )}
                    {editPosition && editDepartment && (
                      <span className="text-content-muted text-xs">•</span>
                    )}
                    {editDepartment && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-surface-muted text-content-secondary border border-border-subtle">
                        {getDeptName(editDepartment)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pb-1">
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
            </div>

            {/* Item #187 — Tab bar Velzon */}
            <div className="flex overflow-x-auto border-t border-border-subtle px-2 sm:px-4 mt-4">
              {(
                (pageMode === "view"
                  ? [
                      { id: "overview", label: t("userDetail.tabOverview"), icon: LayoutGrid },
                      { id: "project", label: t("userDetail.tabProject"), icon: Layout },
                      { id: "document", label: t("userDetail.tabDocument"), icon: FileText },
                    ]
                  : [
                      { id: "personal", label: t("userDetail.tabPersonalDetail"), icon: IdCard },
                      { id: "password", label: t("userDetail.tabChangePassword"), icon: KeyRound },
                      ...(isAdmin
                        ? [
                            {
                              id: "project" as const,
                              label: t("userDetail.tabProject"),
                              icon: Layout,
                            },
                            {
                              id: "settings" as const,
                              label: t("userDetail.tabSettings"),
                              icon: Settings2,
                            },
                          ]
                        : []),
                    ]) as Array<{
                  id: DetailTab;
                  label: string;
                  icon: React.ComponentType<{ className?: string }>;
                }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-3 text-xs font-medium whitespace-nowrap transition-all border-b-2 cursor-pointer",
                    activeTab === tab.id
                      ? "text-indigo-600 border-indigo-500 bg-indigo-500/10"
                      : "text-content-muted border-transparent hover:text-content-body"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            {/* Tab: Overview */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT: kartu "Info" ala Velzon, Team, dan Login History */}
                <div className="lg:col-span-4 space-y-5">
                  <div className="bg-surface p-4 rounded-lg border border-border-subtle shadow-xs space-y-3">
                    <div className="flex items-center gap-2">
                      <IdCard className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-xs font-medium text-content-strong uppercase tracking-wider">
                        {t("userDetail.tabPersonalDetail")}
                      </h3>
                    </div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-2.5 text-xs items-baseline">
                      <span className="font-medium text-content-strong whitespace-nowrap">
                        {t("userDetail.fullName")} :
                      </span>
                      <span className="text-content-body break-words">
                        {user.displayName || user.username}
                      </span>

                      <span className="font-medium text-content-strong whitespace-nowrap">
                        {t("userDetail.email")} :
                      </span>
                      <span className="text-content-body break-all">{user.email || "—"}</span>

                      <span className="font-medium text-content-strong whitespace-nowrap">
                        {t("userDetail.phone")} :
                      </span>
                      <span className="text-content-body">{user.phone || "—"}</span>

                      <span className="font-medium text-content-strong whitespace-nowrap">
                        {t("userDetail.department")} :
                      </span>
                      <span className="text-content-body">{getDeptName(user.department)}</span>

                      <span className="font-medium text-content-strong whitespace-nowrap">
                        {t("userDetail.position")} :
                      </span>
                      <span className="text-content-body">{getPosName(user.position)}</span>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="bg-surface p-4 rounded-lg border border-border-subtle shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-xs font-medium text-content-strong uppercase tracking-wider">
                          {t("userDetail.teamTitle")} ({teammates.length})
                        </h3>
                      </div>
                    </div>
                    <p className="text-xs sm:text-[11px] text-content-muted -mt-2">
                      {t("userDetail.teamHint")}
                    </p>
                    {teammates.length === 0 ? (
                      <p className="text-xs text-content-subtle italic py-4 text-center">
                        {t("userDetail.noTeammates")}
                      </p>
                    ) : (
                      <div className="divide-y divide-border-faint max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        {teammates.map((tm) => (
                          <div
                            key={tm.id || tm.uid}
                            className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0"
                          >
                            <UserAvatar user={tm} className="w-8 h-8 text-xs shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-content-strong truncate">
                                {tm.displayName || tm.username || tm.email}
                              </div>
                              <div className="text-xs sm:text-[10px] text-indigo-500 truncate">
                                {tm.position || tm.role || ""}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section: Login History di bawah Panel Team ala Velzon */}
                  <div className="bg-surface p-4 rounded-lg border border-border-subtle shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Laptop className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-xs font-medium text-content-strong uppercase tracking-wider">
                          {t("userDetail.loginHistory")}
                        </h3>
                      </div>
                      {userSessions.filter((s) => !s.isCurrent).length > 0 && (
                        <button
                          type="button"
                          onClick={handleRevokeAllOtherSessions}
                          className="text-xs sm:text-[10px] text-rose-600 hover:underline font-medium cursor-pointer"
                        >
                          {t("userDetail.allLogout")}
                        </button>
                      )}
                    </div>
                    <p className="text-xs sm:text-[11px] text-content-muted -mt-2">
                      {t("userDetail.loginHistoryHint")}
                    </p>

                    <div className="divide-y divide-border-faint max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                      {userSessions.map((item) => {
                        const DeviceIcon =
                          item.deviceType === "smartphone"
                            ? Smartphone
                            : item.deviceType === "tablet"
                              ? Tablet
                              : Laptop;

                        return (
                          <div
                            key={item.id}
                            className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1.5 rounded-md bg-surface-sunken border border-border-subtle text-indigo-600 shrink-0">
                                <DeviceIcon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-content-strong truncate">
                                    {item.device}
                                  </span>
                                  {item.isCurrent && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-700 shrink-0">
                                      {t("userDetail.currentDevice")}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-content-muted truncate mt-0.5">
                                  <span className="font-medium text-content-body">
                                    {item.location}
                                  </span>
                                  <span> • </span>
                                  <span>{item.ip}</span>
                                  <span> • </span>
                                  <span>{item.time}</span>
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {item.isCurrent ? (
                                <span className="text-[10px] text-emerald-600 font-semibold px-1.5 py-0.5">
                                  {t("userDetail.active")}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeSession(item.id)}
                                  className="text-[10px] text-rose-600 hover:bg-rose-500/10 px-1.5 py-0.5 rounded transition cursor-pointer"
                                >
                                  Logout
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* RIGHT: stat cards, Recent Activity (Today/Weekly/Monthly —
                      dari ActivityLog sungguhan), Recently Created (pengganti
                      "Popular Posts": tugas yang dilaporkan/dibuat pengguna
                      ini), lalu deretan Projects ala Velzon. */}
                <div className="lg:col-span-8 space-y-5">
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
                          {t("rakit.projectsCount", { count: userProjectsList.length })}
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
                          {t("rakit.tasksCount", { count: userTasks.length })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Item #187 — "Recent Activity" Velzon Vertical Timeline UI */}
                  <div className="bg-surface p-4 sm:p-5 rounded-lg border border-border-subtle shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-border-subtle/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-xs font-semibold text-content-strong uppercase tracking-wider">
                          {t("userDetail.recentActivityTitle")}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 bg-surface-sunken border border-border-subtle rounded-md p-0.5">
                        {(
                          [
                            { id: "today", label: t("userDetail.filterToday") },
                            { id: "week", label: t("userDetail.filterWeek") },
                            { id: "month", label: t("userDetail.filterMonth") },
                          ] as const
                        ).map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setActivityFilter(f.id)}
                            className={cn(
                              "px-2.5 py-1 rounded text-xs sm:text-[10px] font-semibold uppercase transition-colors cursor-pointer",
                              activityFilter === f.id
                                ? "bg-indigo-600 text-content-inverse shadow-xs"
                                : "text-content-muted hover:text-content-body"
                            )}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {userActivityLogsFiltered.length === 0 ? (
                      <p className="text-xs text-content-subtle italic py-8 text-center">
                        {t("userDetail.noActivity")}
                      </p>
                    ) : (
                      <div className="max-h-80 overflow-y-auto pr-2 pl-3 py-1 custom-scrollbar">
                        <div className="relative pl-6 ml-3 space-y-6 border-l-2 border-border-subtle">
                          {userActivityLogsFiltered.map((log) => {
                            const actDate = ensureDate(log.createdAt);

                            // Format activity details: ganti Task UUID mentah dengan nama tugas yang manusiawi jika cocok
                            let formattedDetails = log.details || "";
                            if (formattedDetails) {
                              (tasks || []).forEach((t) => {
                                if (formattedDetails.includes(t.id)) {
                                  formattedDetails = formattedDetails.replace(
                                    t.id,
                                    `"${t.title}" (${t.key || "TASK"})`
                                  );
                                }
                              });
                            }

                            return (
                              <div key={log.id} className="relative group">
                                {/* Dot / Avatar Node on the Vertical Timeline */}
                                <div className="absolute -left-[37px] top-0 flex items-center justify-center">
                                  <UserAvatar
                                    user={user}
                                    className="w-6 h-6 text-xs ring-4 ring-surface shadow-xs"
                                  />
                                </div>

                                <div className="space-y-1 ml-1">
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <span className="font-semibold text-content-strong">
                                      {user.displayName || user.username}
                                    </span>
                                    <span className="text-content-muted">
                                      {humanizeActivityAction(log.action, formattedDetails)}
                                    </span>
                                    <span className="text-content-subtle text-xs sm:text-[10px] font-mono">
                                      • {formatDistanceToNow(actDate, { addSuffix: true })}
                                    </span>
                                  </div>

                                  {/* Activity Details / Attachment preview if present */}
                                  {formattedDetails && formattedDetails !== log.action && (
                                    <p className="text-xs text-content-secondary leading-relaxed bg-surface-sunken/60 border border-border-subtle/50 p-2.5 rounded-md mt-1.5">
                                      {formattedDetails}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Item #187 — "Recently Created" Items (Task, Meeting, Flowchart, Doc) ala Velzon */}
                  <div className="bg-surface p-4 sm:p-5 rounded-lg border border-border-subtle shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-border-subtle/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-xs font-semibold text-content-strong uppercase tracking-wider">
                          {t("userDetail.recentlyCreated")} ({userCreatedItems.length})
                        </h3>
                      </div>
                    </div>
                    {userCreatedItems.length === 0 ? (
                      <p className="text-xs text-content-subtle italic py-6 text-center">
                        {t("userDetail.noRecentlyCreated")}
                      </p>
                    ) : (
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                        {userCreatedItems.map((item) => {
                          const ItemIcon = item.icon;

                          // Badge type styles
                          const typeBadge =
                            item.type === "meeting"
                              ? {
                                  bg: "bg-purple-500/10 text-purple-700 border-purple-500/30",
                                  label: "Meeting",
                                }
                              : item.type === "flowchart"
                                ? {
                                    bg: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
                                    label: "Flowchart",
                                  }
                                : item.type === "doc"
                                  ? {
                                      bg: "bg-amber-500/10 text-amber-700 border-amber-500/30",
                                      label: "Document",
                                    }
                                  : {
                                      bg: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30",
                                      label: "Task",
                                    };

                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-3 p-3 bg-surface-sunken hover:bg-surface-muted/60 border border-border-subtle rounded-lg transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                                  <ItemIcon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-content-strong truncate">
                                    {item.title}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs sm:text-[10px] text-content-subtle mt-0.5">
                                    {item.subtitle && (
                                      <>
                                        <span className="font-mono text-indigo-600 font-medium uppercase truncate max-w-[120px]">
                                          {item.subtitle}
                                        </span>
                                        <span>•</span>
                                      </>
                                    )}
                                    <span>
                                      {formatDistanceToNow(ensureDate(item.createdAt), {
                                        addSuffix: true,
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={cn(
                                    "text-xs sm:text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase",
                                    typeBadge.bg
                                  )}
                                >
                                  {typeBadge.label}
                                </span>
                                {item.status && item.status !== item.type && (
                                  <span className="text-xs sm:text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface border border-border-subtle text-content-secondary uppercase hidden sm:inline-block">
                                    {item.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Item #187 — deretan "Projects" ala Velzon: pratinjau
                        proyek terkait, data sama dengan tab Project. */}
                  <div className="bg-surface p-4 rounded-lg border border-border-subtle shadow-xs space-y-3">
                    <div className="flex items-center gap-2">
                      <Layout className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-xs font-medium text-content-strong uppercase tracking-wider">
                        {t("userDetail.tabProject")} ({userProjectsList.length})
                      </h3>
                    </div>
                    {userProjectsList.length === 0 ? (
                      <p className="text-xs text-content-subtle italic py-4 text-center">
                        {t("userDetail.noActiveProject")}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {userProjectsList.slice(0, 6).map((p) => {
                          const style = projectStatusStyle(p.status);
                          const members = projectMemberAvatars(p);
                          return (
                            <div
                              key={p.id}
                              className={cn(
                                "p-3 bg-surface-sunken border border-border-subtle rounded-md space-y-2 border-l-4",
                                style.border
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="font-medium text-xs text-content-strong truncate">
                                    {p.name}
                                  </div>
                                  <div className="text-xs sm:text-[10px] font-mono text-indigo-600 uppercase">
                                    {p.key}
                                  </div>
                                </div>
                                {p.status && (
                                  <span
                                    className={cn(
                                      "shrink-0 text-xs sm:text-[10px] font-medium px-1.5 py-0.5 rounded-md border whitespace-nowrap",
                                      style.badge
                                    )}
                                  >
                                    {p.status}
                                  </span>
                                )}
                              </div>
                              {members.length > 0 && (
                                <div className="flex items-center -space-x-1.5">
                                  {members.slice(0, 4).map((m) => (
                                    <UserAvatar
                                      key={m.id || m.uid}
                                      user={m}
                                      className="w-6 h-6 text-xs ring-2 ring-border-subtle"
                                    />
                                  ))}
                                  {members.length > 4 && (
                                    <span className="w-6 h-6 rounded-full bg-surface-muted text-content-subtle text-xs sm:text-[9px] font-medium flex items-center justify-center ring-2 ring-border-subtle">
                                      +{members.length - 4}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MODE LIHAT: 3 Tab Standar Velzon (Overview, Activities, Project, Document) */}
            {pageMode === "view" && activeTab === "personal" && (
              <div className="text-xs text-content-subtle">{t("userDetail.personalInfoDesc")}</div>
            )}

            {/* MODE EDIT: Full-Width Clean Form Layout ala Velzon */}
            {pageMode === "edit" && (
              <div className="bg-surface p-5 sm:p-6 rounded-lg border border-border-subtle shadow-xs space-y-6">
                {/* Tab: Personal Detail Form */}
                {activeTab === "personal" && (
                  <div className="space-y-6">
                    <div className="border-b border-border-subtle pb-3.5">
                      <h3 className="text-sm font-semibold text-content-strong uppercase tracking-wider">
                        {t("userDetail.personalInfoTitle")}
                      </h3>
                      <p className="text-xs text-content-muted mt-0.5">
                        {t("userDetail.personalInfoDesc")}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Full Name */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-content-strong">
                          {t("userDetail.fullName")}
                        </label>
                        <input
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          placeholder={t("userDetail.fullNamePlaceholder")}
                          className="w-full px-3.5 py-2 border border-border-subtle rounded-md text-xs font-medium outline-none focus:border-indigo-500 bg-surface-sunken text-content-strong transition"
                        />
                      </div>

                      {/* Email Address */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-content-strong">
                          {t("userDetail.email")}
                        </label>
                        <input
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder={t("userDetail.emailPlaceholder")}
                          className="w-full px-3.5 py-2 border border-border-subtle rounded-md text-xs font-medium outline-none focus:border-indigo-500 bg-surface-sunken text-content-strong transition"
                        />
                      </div>

                      {/* Phone / WhatsApp */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-content-strong">
                          {t("userDetail.phone")}
                        </label>
                        <input
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder={t("userDetail.phonePlaceholder")}
                          className="w-full px-3.5 py-2 border border-border-subtle rounded-md text-xs font-medium outline-none focus:border-indigo-500 bg-surface-sunken text-content-strong transition"
                        />
                      </div>

                      {/* Department */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-content-strong">
                          {t("userDetail.department")}
                        </label>
                        <StyledDropdown
                          value={editDepartment}
                          onChange={(val: string) => setEditDepartment(val)}
                          options={[
                            {
                              id: "",
                              label: t("userDetail.selectDepartment"),
                              icon: "Building2",
                              color: "#6366F1",
                            },
                            ...(departments.length > 0
                              ? departments
                              : masterData.filter((d) => d.type === "department")
                            ).map((opt: any) => ({
                              id: opt.id || opt.code,
                              label: opt.name || opt.label,
                              icon: opt.icon,
                              color: opt.color,
                            })),
                          ]}
                          type="department"
                          masterData={masterData}
                          className="w-full"
                          buttonClassName="w-full px-3.5 py-2 bg-surface-sunken border border-border-subtle rounded-md text-xs font-medium text-content-strong"
                        />
                      </div>

                      {/* Position / Jabatan */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-content-strong">
                          {t("userDetail.position")}
                        </label>
                        <StyledDropdown
                          value={editPosition}
                          onChange={(val: string) => setEditPosition(val)}
                          options={[
                            {
                              id: "",
                              label: t("userDetail.selectPosition"),
                              icon: "BadgeCheck",
                              color: "#6366F1",
                            },
                            ...(positions.length > 0
                              ? positions
                              : masterData.filter(
                                  (d) => d.type === "jabatan" || d.type === "position"
                                )
                            ).map((opt: any) => ({
                              id: opt.id || opt.code,
                              label: opt.name || opt.label,
                              icon: opt.icon,
                              color: opt.color,
                            })),
                          ]}
                          type="jabatan"
                          masterData={masterData}
                          className="w-full"
                          buttonClassName="w-full px-3.5 py-2 bg-surface-sunken border border-border-subtle rounded-md text-xs font-medium text-content-strong"
                        />
                      </div>

                      {/* System Role (Admin only) */}
                      {isAdmin && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-content-strong">
                            {t("userDetail.systemRole")}
                          </label>
                          <StyledDropdown
                            value={editRole}
                            onChange={(val: string) => {
                              const newRole = val as AppRole;
                              setEditRole(newRole);
                              setEditPermissions(
                                ROLE_DEFAULT_PERMISSIONS[newRole] ||
                                  ROLE_DEFAULT_PERMISSIONS.member ||
                                  ROLE_DEFAULT_PERMISSIONS.viewer ||
                                  (ROLE_DEFAULT_PERMISSIONS.owner as UserPermissions)
                              );
                            }}
                            options={
                              peranSistem.length === 0
                                ? [{ id: "", label: t("users.emptyRoleCatalog") }]
                                : peranSistem.map((p) => ({
                                    id: p.code,
                                    label: p.label,
                                    icon: p.icon || undefined,
                                    color: p.color || undefined,
                                  }))
                            }
                            type="project_role"
                            masterData={masterData}
                            className="w-full"
                            buttonClassName="w-full px-3.5 py-2 bg-surface-sunken border border-border-subtle rounded-md text-xs font-medium text-content-strong"
                          />
                        </div>
                      )}

                      {/* Account Status */}
                      {isAdmin && (
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-semibold text-content-strong">
                            {t("userDetail.accountStatus")}
                          </label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as any)}
                            className="w-full px-3.5 py-2 bg-surface-sunken border border-border-subtle rounded-md text-xs font-medium text-content-strong outline-none focus:border-indigo-500 transition-all cursor-pointer"
                          >
                            <option value="approved">{t("userDetail.activeApproved")}</option>
                            <option value="pending">{t("userDetail.waitingApproval")}</option>
                            <option value="rejected">{t("userDetail.suspendedRejected")}</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons ala Velzon */}
                    <div className="flex items-center justify-end gap-3 pt-5 border-t border-border-subtle">
                      <button
                        type="button"
                        onClick={exitEditMode}
                        className="px-4 py-2 bg-surface-sunken hover:bg-surface-muted text-content-body rounded-md text-xs font-medium border border-border-subtle transition cursor-pointer"
                      >
                        {t("userDetail.cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveUser}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-content-inverse rounded-md text-xs font-semibold shadow-soft transition disabled:opacity-50 cursor-pointer"
                      >
                        {isSaving ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>{t("userDetail.updates")}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab: Change Password Form (3-Column Layout + Login History ala Velzon) */}
                {activeTab === "password" && (
                  <div className="space-y-8">
                    {/* Section: Change Password Fields */}
                    <div className="space-y-5">
                      <div className="border-b border-border-subtle pb-3.5">
                        <h3 className="text-sm font-semibold text-content-strong uppercase tracking-wider">
                          {t("userDetail.tabChangePassword")}
                        </h3>
                        <p className="text-xs text-content-muted mt-0.5">
                          {t("userDetail.passwordUnchangedHint")}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                        {/* Old Password */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-content-strong">
                            {t("userDetail.oldPassword")}*
                          </label>
                          <div className="relative">
                            <input
                              type={showOldPassword ? "text" : "password"}
                              value={editOldPassword}
                              onChange={(e) => setEditOldPassword(e.target.value)}
                              placeholder={t("userDetail.oldPasswordPlaceholder")}
                              className="w-full pl-3 pr-9 py-2 border border-border-subtle rounded-md text-xs font-medium outline-none focus:border-indigo-500 bg-surface-sunken text-content-strong transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowOldPassword((v) => !v)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-body cursor-pointer"
                            >
                              {showOldPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowForgotPasswordModal(true)}
                            className="text-xs sm:text-[11px] text-indigo-600 hover:underline pt-0.5 block cursor-pointer"
                          >
                            {t("userDetail.forgotPassword")}
                          </button>
                        </div>

                        {/* New Password */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-content-strong">
                              {t("userDetail.newPassword")}*
                            </label>
                            <button
                              type="button"
                              onClick={generateRandomPassword}
                              className="text-xs sm:text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                            >
                              <Key className="w-3 h-3" /> {t("jsx.j163")}
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type={showEditPassword ? "text" : "password"}
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              placeholder={t("userDetail.passwordPlaceholder")}
                              className="w-full pl-3 pr-9 py-2 border border-border-subtle rounded-md text-xs font-medium outline-none focus:border-indigo-500 bg-surface-sunken text-content-strong transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditPassword((v) => !v)}
                              title={
                                showEditPassword ? t("ui2.hidePassword") : t("ui2.showPassword")
                              }
                              aria-label={
                                showEditPassword ? t("ui2.hidePassword") : t("ui2.showPassword")
                              }
                              aria-pressed={showEditPassword}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-body cursor-pointer"
                            >
                              {showEditPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Confirm New Password */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-content-strong">
                            {t("userDetail.confirmPassword")}*
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              value={editConfirmPassword}
                              onChange={(e) => setEditConfirmPassword(e.target.value)}
                              placeholder={t("userDetail.confirmPasswordPlaceholder")}
                              className={cn(
                                "w-full pl-3 pr-9 py-2 border rounded-md text-xs font-medium outline-none focus:border-indigo-500 bg-surface-sunken text-content-strong transition",
                                editConfirmPassword && editPassword !== editConfirmPassword
                                  ? "border-rose-500"
                                  : "border-border-subtle"
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((v) => !v)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-body cursor-pointer"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          {editConfirmPassword && editPassword !== editConfirmPassword && (
                            <p className="text-xs sm:text-[11px] text-rose-600">
                              {t("userDetail.passwordMismatch")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-3">
                        <button
                          type="button"
                          onClick={handleSaveUser}
                          disabled={
                            isSaving || !editPassword.trim() || editPassword !== editConfirmPassword
                          }
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-content-inverse rounded-md text-xs font-semibold shadow-soft transition disabled:opacity-50 cursor-pointer"
                        >
                          {isSaving ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Key className="w-3.5 h-3.5" />
                          )}
                          <span>{t("userDetail.changePasswordAction")}</span>
                        </button>
                      </div>
                    </div>

                    {/* Section: Login History ala Velzon (Real Interactive State) */}
                    <div className="space-y-4 pt-4 border-t border-border-subtle">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-content-strong uppercase tracking-wider">
                            {t("userDetail.loginHistory")}
                          </h4>
                          <p className="text-xs sm:text-[11px] text-content-muted mt-0.5">
                            {t("userDetail.loginHistoryHint")}
                          </p>
                        </div>
                        {userSessions.filter((s) => !s.isCurrent).length > 0 && (
                          <button
                            type="button"
                            onClick={handleRevokeAllOtherSessions}
                            className="text-xs sm:text-[11px] text-rose-600 hover:underline font-medium cursor-pointer"
                          >
                            {t("userDetail.allLogout")}
                          </button>
                        )}
                      </div>

                      <div className="divide-y divide-border-faint border border-border-subtle rounded-lg overflow-hidden bg-surface-sunken">
                        {userSessions.map((item) => {
                          const DeviceIcon =
                            item.deviceType === "smartphone"
                              ? Smartphone
                              : item.deviceType === "tablet"
                                ? Tablet
                                : Laptop;

                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 sm:p-3.5 hover:bg-surface-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md bg-surface border border-border-subtle text-indigo-600 shrink-0">
                                  <DeviceIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-content-strong">
                                      {item.device}
                                    </span>
                                    {item.isCurrent && (
                                      <span className="px-1.5 py-0.5 rounded text-xs sm:text-[9px] font-bold bg-emerald-500/20 text-emerald-700">
                                        {t("userDetail.currentDevice")}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs sm:text-[10px] text-content-muted mt-0.5">
                                    <span>{item.location}</span>
                                    <span>•</span>
                                    <span className="font-mono">{item.ip}</span>
                                    <span>•</span>
                                    <span>{item.time}</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                {item.isCurrent ? (
                                  <span className="text-xs sm:text-[11px] text-emerald-600 font-medium px-2 py-1">
                                    {t("userDetail.active")}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeSession(item.id)}
                                    className="text-xs sm:text-[11px] text-content-muted hover:text-rose-600 px-2 py-1 rounded hover:bg-surface transition cursor-pointer"
                                  >
                                    {t("userDetail.logoutAction")}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Settings (Admin Matrix - 4-Group Collapsible Accordion ala Sidebar) */}
                {activeTab === "settings" && isAdmin && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-border-subtle pb-3.5">
                      <div>
                        <h4 className="font-semibold text-content-strong text-sm uppercase tracking-wider">
                          {t("userDetail.activePermissions")}
                        </h4>
                        <p className="text-xs text-content-muted mt-0.5">
                          {t("userDetail.permissionHint")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-content-body bg-surface-sunken border border-border-subtle p-3 rounded-md text-xs">
                      <Lock className="w-4 h-4 shrink-0 mt-0.5 text-content-muted" />
                      <span>{t("userDetail.permissionReadOnlyNote")}</span>
                    </div>

                    {/* 4 Accordion Groups */}
                    <div className="space-y-3.5">
                      {PERMISSION_SECTIONS.map((section) => {
                        const isOpen = !!openSections[section.id];

                        return (
                          <div
                            key={section.id}
                            className="border border-border-subtle rounded-lg overflow-hidden bg-surface shadow-xs transition-all"
                          >
                            {/* Accordion Group Header (Clickable Trigger) */}
                            <div
                              onClick={() => toggleSection(section.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  toggleSection(section.id);
                                }
                              }}
                              className="w-full flex items-center justify-between px-4 py-3 bg-surface-sunken hover:bg-surface-muted/60 transition-colors cursor-pointer text-left select-none border-b border-border-subtle/50"
                            >
                              <div className="flex items-center gap-2.5">
                                {isOpen ? (
                                  <FolderOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                                ) : (
                                  <Folder className="w-4 h-4 text-content-muted shrink-0" />
                                )}
                                <span className="text-xs font-bold text-content-strong uppercase tracking-wider">
                                  {t(section.titleKey)}
                                </span>
                                <span className="text-xs sm:text-[10px] text-content-muted font-normal">
                                  ({section.modules.length} {t("userDetail.module").toLowerCase()})
                                </span>
                              </div>

                              <div className="p-1 rounded-md text-content-muted hover:text-content-strong">
                                {isOpen ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </div>
                            </div>

                            {/* Accordion Content Table */}
                            {isOpen && (
                              <div className="overflow-x-auto">
                                <ResponsiveTable className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-surface-sunken/40 border-b border-border-subtle text-content-muted">
                                    <tr>
                                      <th className="py-2.5 px-4 font-semibold text-xs uppercase w-2/5">
                                        {t("userDetail.module")}
                                      </th>
                                      {(["read", "create", "update", "delete"] as const).map(
                                        (action) => (
                                          <th
                                            key={action}
                                            className="py-2.5 px-2 font-semibold text-xs uppercase text-center w-20"
                                          >
                                            {action}
                                          </th>
                                        )
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border-faint bg-surface">
                                    {section.modules.map((module) => {
                                      const info = MODULE_DESCRIPTIONS[module];
                                      const moduleInfo = info
                                        ? { label: t(info.label), desc: t(info.desc) }
                                        : { label: module as string, desc: "" };

                                      return (
                                        <tr
                                          key={module}
                                          className="hover:bg-surface-sunken/40 transition-colors"
                                        >
                                          <td className="py-2.5 px-4 font-medium text-content-strong text-xs">
                                            <div
                                              className="inline-flex items-center gap-1.5"
                                              title={moduleInfo.desc}
                                            >
                                              <span className="font-semibold text-content-body">
                                                {moduleInfo.label}
                                              </span>
                                            </div>
                                          </td>

                                          {(["read", "create", "update", "delete"] as const).map(
                                            (action) => {
                                              const isChecked = editPermissions[module]?.[action];
                                              const isDefaultGranted =
                                                ROLE_DEFAULT_PERMISSIONS[editRole]?.[module]?.[
                                                  action
                                                ];
                                              const isOverride = isChecked !== isDefaultGranted;

                                              return (
                                                <td key={action} className="py-2 px-2 text-center">
                                                  <div
                                                    onClick={() =>
                                                      handleTogglePermission(module, action)
                                                    }
                                                    role="img"
                                                    aria-label={`${moduleInfo.label} ${action}: ${
                                                      isChecked
                                                        ? t("ui2.granted")
                                                        : t("ui2.revoked")
                                                    } (${
                                                      isOverride
                                                        ? t("ui2.explicitOverride")
                                                        : t("ui2.roleDefault")
                                                    })`}
                                                    className={cn(
                                                      "w-5 h-5 rounded-md flex items-center justify-center mx-auto border relative cursor-pointer select-none transition-all",
                                                      isChecked
                                                        ? "bg-indigo-600 text-content-inverse border-indigo-500 shadow-xs"
                                                        : "bg-surface-sunken text-content-subtle border-border-subtle hover:border-indigo-400",
                                                      isOverride &&
                                                        "ring-2 ring-amber-400 ring-offset-1"
                                                    )}
                                                    title={`${
                                                      isChecked
                                                        ? t("ui2.granted")
                                                        : t("ui2.revoked")
                                                    } · ${
                                                      isOverride
                                                        ? t("ui2.explicitOverride")
                                                        : t("ui2.roleDefault")
                                                    }`}
                                                  >
                                                    <Check
                                                      className={cn(
                                                        "w-3 h-3 text-current transition-opacity",
                                                        isChecked ? "opacity-100" : "opacity-0"
                                                      )}
                                                    />
                                                    {isOverride && (
                                                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full ring-1 ring-white" />
                                                    )}
                                                  </div>
                                                </td>
                                              );
                                            }
                                          )}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </ResponsiveTable>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Project — delegasi, daftar proyek terkait + tugasnya.
                  Form delegasi & tombol keluarkan HANYA di mode edit — mode
                  lihat murni baca-saja, mengikuti tab "Projects" Velzon. */}
            {activeTab === "project" && (
              <div className="space-y-5">
                {/* Form Delegasi Project Baru */}
                {isAdmin && pageMode === "edit" && (
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
                        <StyledDropdown
                          value={selectedAssignProjectRole}
                          onChange={(val: string) => setSelectedAssignProjectRole(val)}
                          options={
                            peranProyek.length === 0
                              ? [{ id: "", label: t("userDetail.emptyProjectRoleCatalog") }]
                              : peranProyek.map((p) => ({
                                  id: p.code,
                                  label: p.label,
                                  icon: p.icon || undefined,
                                  color: p.color || undefined,
                                }))
                          }
                          type="project_role"
                          masterData={masterData}
                          className="w-full"
                          buttonClassName="w-full px-3 py-1.5 bg-surface border border-border-subtle rounded-md text-xs font-medium text-content-strong"
                        />
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
                        const style = projectStatusStyle(p.status);

                        const members = projectMemberAvatars(p);
                        const isExpanded = expandedProjectTasks[p.id] !== false;

                        return (
                          <div
                            key={p.id}
                            className={cn(
                              "p-3 bg-surface-sunken border border-border-subtle rounded-md space-y-2.5 border-l-4",
                              style.border
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div>
                                  <div className="font-medium text-xs text-content-strong">
                                    {p.name}
                                  </div>
                                  <div className="text-xs sm:text-[10px] font-mono text-indigo-600 uppercase mt-0.5">
                                    {p.key}
                                  </div>
                                </div>

                                {/* Tim yang ada di dalam proyek ini */}
                                {members.length > 0 && (
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <div className="flex items-center -space-x-1.5">
                                      {members.slice(0, 4).map((m) => (
                                        <UserAvatar
                                          key={m.id || m.uid}
                                          user={m}
                                          className="w-5 h-5 text-[10px] ring-2 ring-surface shadow-2xs"
                                        />
                                      ))}
                                      {members.length > 4 && (
                                        <span className="w-5 h-5 rounded-full bg-surface-muted text-content-subtle text-xs sm:text-[8px] font-semibold flex items-center justify-center ring-2 ring-surface">
                                          +{members.length - 4}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs sm:text-[10px] text-content-muted font-medium">
                                      {t("rakit.membersCount", { count: members.length })}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
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

                                {/* Dropdown toggle (v) untuk lihat / sembunyikan detail tugas */}
                                {projectTasks.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleProjectTasks(p.id)}
                                    className="p-1 rounded-md text-content-muted hover:text-content-strong hover:bg-surface transition-colors cursor-pointer"
                                    title={isExpanded ? "Sembunyikan Tugas" : "Lihat Tugas"}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-indigo-600" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-content-subtle" />
                                    )}
                                  </button>
                                )}

                                {isAdmin && pageMode === "edit" && (
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

                            {/* Tasks in project (Collapsable via Dropdown icon) */}
                            {projectTasks.length > 0 && isExpanded && (
                              <div className="pt-2 border-t border-border-subtle/60 space-y-1.5 animate-in fade-in duration-150">
                                <div className="flex items-center justify-between text-xs sm:text-[10px] text-content-subtle font-semibold uppercase tracking-wider">
                                  <span>Tugas Terdelegasi ({projectTasks.length}):</span>
                                </div>
                                <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                  {projectTasks.map((t) => (
                                    <div
                                      key={t.id}
                                      className="flex items-center justify-between text-xs bg-surface p-1.5 px-2.5 rounded-md border border-border-subtle/80 shadow-2xs hover:border-indigo-500/30 transition-colors"
                                    >
                                      <div className="min-w-0 flex-1 pr-2">
                                        <div className="font-medium text-content-strong truncate">
                                          {t.title}
                                        </div>
                                        <div className="text-xs sm:text-[10px] font-mono text-indigo-600 uppercase">
                                          {t.key || "TASK"}
                                        </div>
                                      </div>
                                      <span className="text-xs sm:text-[10px] font-medium px-2 py-0.5 rounded bg-surface-muted text-content-secondary uppercase shrink-0">
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
              </div>
            )}

            {/* Tab: Document — Tabel Dokumen ala Velzon */}
            {activeTab === "document" && (
              <div className="bg-surface p-4 sm:p-5 rounded-lg border border-border-subtle shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-border-subtle/60 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-semibold text-content-strong uppercase tracking-wider">
                      {t("userDetail.documentTitle")} ({userDocuments.length})
                    </h3>
                  </div>
                </div>

                {userDocuments.length === 0 ? (
                  <p className="text-xs text-content-subtle italic py-8 text-center">
                    {t("userDetail.noDocuments")}
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <ResponsiveTable className="w-full text-left text-xs border-collapse">
                        <thead className="bg-surface-sunken/40 border-b border-border-subtle text-content-muted">
                          <tr>
                            <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
                              File Name
                            </th>
                            <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
                              Type
                            </th>
                            <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
                              Size
                            </th>
                            <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
                              Upload Date
                            </th>
                            <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-faint bg-surface">
                          {userDocuments.slice(0, docDisplayLimit).map((doc) => {
                            const info = getFileDisplayInfo(doc.name, doc.type);
                            const IconComponent = info.icon;
                            const uploadDateStr = ensureDate(doc.createdAt).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            );

                            return (
                              <tr
                                key={doc.id}
                                className="hover:bg-surface-sunken/40 transition-colors group"
                              >
                                {/* File Name + Icon (Clickable to download/open) */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={cn(
                                        "w-9 h-9 rounded-md flex items-center justify-center shrink-0 shadow-2xs",
                                        info.bgColor
                                      )}
                                    >
                                      <IconComponent className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={doc.name}
                                        className="font-medium text-xs text-content-strong hover:text-indigo-600 hover:underline transition-colors block truncate max-w-xs sm:max-w-md cursor-pointer"
                                        title={`Unduh / Buka: ${doc.name}`}
                                      >
                                        {doc.name}
                                      </a>
                                      {doc.taskTitle && (
                                        <div className="text-[10px] text-content-subtle truncate">
                                          {doc.taskTitle}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Type */}
                                <td className="py-3 px-4 text-content-muted font-medium whitespace-nowrap">
                                  {info.typeLabel}
                                </td>

                                {/* Size */}
                                <td className="py-3 px-4 text-content-muted whitespace-nowrap">
                                  {doc.size || "1.20 MB"}
                                </td>

                                {/* Upload Date */}
                                <td className="py-3 px-4 text-content-muted whitespace-nowrap font-mono text-[11px]">
                                  {uploadDateStr}
                                </td>

                                {/* Action: Download Button */}
                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={doc.name}
                                    className="inline-flex p-1.5 rounded-md text-content-muted hover:text-indigo-600 hover:bg-surface-muted transition-colors cursor-pointer"
                                    title="Download File"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </ResponsiveTable>
                    </div>

                    {/* Load More Button if more documents exist */}
                    {userDocuments.length > docDisplayLimit && (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setDocDisplayLimit((prev) => prev + 6)}
                          className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-medium py-1 px-3 rounded-md transition cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Load more</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />
    </div>
  );
};

export default UserDetailView;
