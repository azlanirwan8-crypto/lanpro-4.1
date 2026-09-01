import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { StyledDropdown } from "../../components/ui/CommonComponents";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Laptop,
  Smartphone,
  Globe,
  MapPin,
  Clock,
  LogOut,
  Activity,
  User,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldAlert,
  ChevronRight as ArrowRight,
  Monitor,
} from "lucide-react";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { apiClient } from "../../lib/api";
import { PeranEfektif } from "../../types/roles";
import { confirmDeleteAlert, showSuccessAlert } from "../../lib/sweetalert";
import { toast } from "sonner";

interface UserSessionItem {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  city: string | null;
  country: string | null;
  location: string | null;
  loginAt: string;
  logoutAt: string | null;
  lastActiveAt: string | null;
  status: "ACTIVE" | "LOGGED_OUT" | "FORCE_LOGOUT" | "TERMINATED" | string;
  displayName: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
  avatar: string | null;
}

interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  todaySessions: number;
  activeUsersCount: number;
}

interface ActivityLogItem {
  id: string;
  userId: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  changes: any;
  oldValues?: any;
  newValues?: any;
  createdAt: string;
  source: "AUDIT" | "ACTIVITY";
}

export interface UserSessionsPanelProps {
  userRole?: PeranEfektif;
  currentUserId?: string;
}

export const UserSessionsPanel: React.FC<UserSessionsPanelProps> = () => {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [stats, setStats] = useState<SessionStats>({
    totalSessions: 0,
    activeSessions: 0,
    todaySessions: 0,
    activeUsersCount: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  // Modal State
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<{
    id: string;
    name: string;
    email: string;
    role?: string | null;
    avatar?: string | null;
  } | null>(null);
  const [userActivities, setUserActivities] = useState<ActivityLogItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState<boolean>(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "15");
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await apiClient.get(`/api/admin/sessions?${params.toString()}`);
      if (res.data?.status === "success") {
        setSessions(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalRecords(res.data.total || 0);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error("Gagal memuat data sesi pengguna:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchSessions();
    const intervalId = setInterval(() => {
      fetchSessions();
    }, 10000);
    return () => clearInterval(intervalId);
  }, [fetchSessions]);

  const handleTerminateSession = async (session: UserSessionItem) => {
    const isConfirmed = await confirmDeleteAlert(
      t("sessionMonitor.terminateConfirmTitle", "Putuskan Sesi Ini?"),
      t(
        "sessionMonitor.terminateConfirmMsg",
        `Apakah Anda yakin ingin memutus sesi aktif pengguna '${session.displayName || session.username || session.email}'? Pengguna akan dipaksa keluar.`
      )
    );

    if (!isConfirmed) return;

    setTerminatingId(session.id);
    try {
      const res = await apiClient.post(`/api/admin/sessions/${session.id}/terminate`);
      if (res.data?.status === "success") {
        showSuccessAlert(
          t("sessionMonitor.terminateSuccessTitle", "Sesi Diputus"),
          t("sessionMonitor.terminateSuccessMsg", "Sesi pengguna berhasil diputuskan secara paksa.")
        );
        fetchSessions();
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          t("sessionMonitor.terminateFail", "Gagal memutus sesi pengguna")
      );
    } finally {
      setTerminatingId(null);
    }
  };

  const handleOpenActivityModal = async (user: {
    id: string;
    name: string;
    email: string;
    role?: string | null;
    avatar?: string | null;
  }) => {
    setSelectedUserForActivity(user);
    setLoadingActivities(true);
    try {
      const res = await apiClient.get(`/api/admin/users/${user.id}/activities?limit=50`);
      if (res.data?.status === "success") {
        setUserActivities(res.data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat log aktivitas user:", err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedUserForActivity(null);
    setUserActivities([]);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      let d: Date;
      if (typeof dateStr === "number" || /^\d+$/.test(String(dateStr))) {
        d = new Date(Number(dateStr));
      } else {
        let isoStr = String(dateStr).trim();
        if (!isoStr.endsWith("Z") && !isoStr.includes("+") && !isoStr.includes("Z")) {
          isoStr = isoStr.replace(" ", "T") + "Z";
        }
        d = new Date(isoStr);
      }
      if (isNaN(d.getTime())) return String(dateStr);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(d);
    } catch {
      return String(dateStr);
    }
  };

  const isMobileDevice = (device?: string | null, os?: string | null) => {
    const check = `${device || ""} ${os || ""}`.toLowerCase();
    return (
      check.includes("android") ||
      check.includes("iphone") ||
      check.includes("ipad") ||
      check.includes("mobile")
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-sunken p-3.5 sm:p-4 overflow-y-auto space-y-3.5">
      {/* Velzon Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <nav className="flex items-center gap-1.5 text-[11px] font-normal uppercase tracking-wider text-content-subtle mb-0.5">
            <span>{t("sessionMonitor.breadcrumbGroup", "ADMINISTRATION")}</span>
            <ArrowRight className="w-3 h-3 text-content-subtle" />
            <span className="text-primary">
              {t("sessionMonitor.breadcrumbItem", "SESI PENGGUNA")}
            </span>
          </nav>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-content-strong tracking-tight">
              {t("sessionMonitor.title", "Monitoring Sesi & Aktivitas Pengguna")}
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {t("sessionMonitor.liveMonitoring", "Live Monitoring")}
            </span>
          </div>
          <p className="text-xs text-content-muted mt-0.5">
            {t(
              "sessionMonitor.subtitle",
              "Pantau status login, riwayat sesi, lokasi, perangkat, dan log aktivitas pengguna secara real-time."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => fetchSessions()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-content-strong bg-surface hover:bg-surface-hover border border-border-subtle rounded-lg transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{t("sessionMonitor.refresh", "Segarkan")}</span>
          </button>
        </div>
      </div>

      {/* Velzon Stat Widgets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Sesi Aktif */}
        <div className="bg-surface border border-border-subtle rounded-xl p-3 shadow-xs flex flex-col justify-between transition-all hover:border-emerald-500/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-normal uppercase tracking-wider text-content-subtle">
                {t("sessionMonitor.activeSessions", "Sesi Aktif Sekarang")}
              </p>
              <h3 className="text-xl font-bold text-content-strong mt-0.5">
                {stats.activeSessions}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] text-content-muted">
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              {t("sessionMonitor.connectedSessionsTag", "Sesi terhubung saat ini")}
            </span>
          </div>
        </div>

        {/* Card 2: Pengguna Online */}
        <div className="bg-surface border border-border-subtle rounded-xl p-3 shadow-xs flex flex-col justify-between transition-all hover:border-primary/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-normal uppercase tracking-wider text-content-subtle">
                {t("sessionMonitor.onlineUsers", "Pengguna Online")}
              </p>
              <h3 className="text-xl font-bold text-content-strong mt-0.5">
                {stats.activeUsersCount}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] text-content-muted">
            <span className="text-primary font-medium">
              {t("sessionMonitor.uniqueActiveUsersTag", "Akun aktif unik")}
            </span>
          </div>
        </div>

        {/* Card 3: Login Hari Ini */}
        <div className="bg-surface border border-border-subtle rounded-xl p-3 shadow-xs flex flex-col justify-between transition-all hover:border-amber-500/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-normal uppercase tracking-wider text-content-subtle">
                {t("sessionMonitor.todayLogins", "Login Hari Ini")}
              </p>
              <h3 className="text-xl font-bold text-content-strong mt-0.5">
                {stats.todaySessions}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] text-content-muted">
            <span className="text-amber-600 font-medium">
              {t("sessionMonitor.todayAuthTag", "Total autentikasi 24j")}
            </span>
          </div>
        </div>

        {/* Card 4: Total Riwayat Sesi */}
        <div className="bg-surface border border-border-subtle rounded-xl p-3 shadow-xs flex flex-col justify-between transition-all hover:border-info/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-normal uppercase tracking-wider text-content-subtle">
                {t("sessionMonitor.totalHistory", "Total Riwayat Sesi")}
              </p>
              <h3 className="text-xl font-bold text-content-strong mt-0.5">
                {stats.totalSessions}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0 border border-info/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] text-content-muted">
            <span className="text-info font-medium">
              {t("sessionMonitor.savedLogsTag", "Rekaman log tersimpan")}
            </span>
          </div>
        </div>
      </div>

      {/* Velzon Main Card: Search, Filter & Table */}
      <div className="bg-surface border border-border-subtle rounded-xl shadow-xs overflow-hidden flex flex-col">
        {/* Card Header Filter Bar */}
        <div className="p-3 border-b border-border-subtle bg-surface flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-content-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t(
                  "sessionMonitor.searchPlaceholder",
                  "Cari nama, email, IP, lokasi..."
                )}
                className="w-full pl-10 pr-4 py-2 bg-surface-sunken border border-border-subtle rounded-lg text-sm text-content-strong placeholder:text-content-subtle focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-content-subtle shrink-0 hidden sm:inline" />
              <StyledDropdown
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
                options={[
                  { id: "ALL", label: t("sessionMonitor.statusAll", "Semua Status") },
                  { id: "ACTIVE", label: t("sessionMonitor.statusActive", "Sesi Aktif") },
                  { id: "LOGGED_OUT", label: t("sessionMonitor.statusLoggedOut", "Sudah Keluar") },
                  {
                    id: "FORCE_LOGOUT",
                    label: t("sessionMonitor.statusForceLogout", "Diputus Admin"),
                  },
                ]}
                buttonClassName="px-3 py-2 bg-surface-sunken border border-border-subtle rounded-lg text-sm text-left font-medium text-content-strong"
              />
            </div>
          </div>

          <div className="text-xs text-content-subtle font-medium self-end sm:self-auto">
            {t("sessionMonitor.totalRecords", "Total Sesi: {{total}}", { total: totalRecords })}
          </div>
        </div>

        {/* Table Body — desktop; kartu di HP (#309) */}
        <div className="hidden sm:block overflow-x-auto min-h-[350px]">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-surface-sunken/70 border-b border-border-subtle text-[11px] font-normal uppercase tracking-wider text-content-subtle">
                <th className="py-2.5 px-3 w-[22%]">{t("sessionMonitor.colUser", "PENGGUNA")}</th>
                <th className="py-2.5 px-3 w-[16%]">
                  {t("sessionMonitor.colIp", "IP & GEOLOKASI")}
                </th>
                <th className="py-2.5 px-3 w-[26%]">
                  {t("sessionMonitor.colDevice", "PERANGKAT / BROWSER")}
                </th>
                <th className="py-2.5 px-3 w-[18%]">
                  {t("sessionMonitor.colLogin", "WAKTU LOGIN")}
                </th>
                <th className="py-2.5 px-3 w-[12%]">
                  {t("sessionMonitor.colStatus", "STATUS / WAKTU LOGOUT")}
                </th>
                <th className="py-2.5 px-3 w-[6%] text-center">
                  {t("sessionMonitor.colAction", "AKSI")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-content-subtle">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>{t("sessionMonitor.loading", "Memuat data sesi pengguna...")}</span>
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-content-subtle">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-content-subtle opacity-50" />
                    <p className="font-medium text-content-strong">
                      {t("sessionMonitor.noData", "Tidak ada sesi pengguna ditemukan")}
                    </p>
                    <p className="text-xs text-content-subtle mt-1">
                      {t(
                        "sessionMonitor.noDataHint",
                        "Coba ganti kata kunci pencarian atau filter status."
                      )}
                    </p>
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const isActive = session.status === "ACTIVE";
                  const isMobile = isMobileDevice(session.device, session.os);

                  return (
                    <tr
                      key={session.id}
                      className="hover:bg-surface-hover/70 transition-colors group"
                    >
                      {/* Pengguna */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={session.displayName || session.username || "User"}
                            src={session.avatar || undefined}
                            size="md"
                          />
                          <div>
                            <span className="font-semibold text-content-strong text-sm block">
                              {session.displayName ||
                                session.username ||
                                t("sessionMonitor.unnamed", "Tanpa Nama")}
                            </span>
                            <span className="text-xs text-content-subtle block">
                              {session.email || session.username || "-"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* IP & Geolokasi */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-start gap-2">
                          <Globe className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium font-mono text-xs text-content-strong block">
                              {session.ipAddress || "127.0.0.1"}
                            </span>
                            <span className="text-xs text-content-subtle flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-content-subtle" />
                              {(() => {
                                const ip = (session.ipAddress || "").replace(/^::ffff:/, "").trim();
                                const isLocal =
                                  !ip ||
                                  ip === "127.0.0.1" ||
                                  ip === "::1" ||
                                  ip === "localhost" ||
                                  ip.startsWith("192.168.") ||
                                  ip.startsWith("10.") ||
                                  ip.startsWith("172.16.");

                                if (isLocal) {
                                  return session.location || "Local Network";
                                }
                                return (
                                  session.location ||
                                  (session.city && session.country
                                    ? `${session.city}, ${session.country}`
                                    : session.city || session.country || "Jakarta, ID")
                                );
                              })()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Perangkat & Browser */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-surface-sunken border border-border-subtle flex items-center justify-center text-content-base shrink-0">
                            {isMobile ? (
                              <Smartphone className="w-4 h-4 text-info" />
                            ) : (
                              <Laptop className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-content-strong block truncate">
                              {session.browser || "Unknown Browser"}
                            </span>
                            <span
                              className="text-xs text-content-subtle block max-w-[220px] truncate"
                              title={`{(session.os && !session.os.includes("Unknown") ? session.os : "Windows 10")} • Login via ${session.email || session.username || "Form Login"}`}
                            >
                              {session.os && !session.os.includes("Unknown")
                                ? session.os
                                : "Windows 10"}{" "}
                              • Login via {session.email || session.username || "Form Login"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Waktu Login */}
                      <td className="py-2.5 px-3">
                        <div className="text-xs text-content-strong font-medium flex items-center gap-1.5 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 text-content-subtle" />
                          <span>{formatDate(session.loginAt)}</span>
                        </div>
                      </td>

                      {/* Status / Waktu Logout */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {t("sessionMonitor.statusActive", "Sesi Aktif")}
                          </span>
                        ) : session.status === "FORCE_LOGOUT" || session.status === "TERMINATED" ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/10 text-danger border border-danger/20">
                              <XCircle className="w-2.5 h-2.5" />
                              {t("sessionMonitor.statusForceLogout", "Diputus Admin")}
                            </span>
                            <span className="text-[10px] text-content-subtle block mt-0.5">
                              {formatDate(session.logoutAt)}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-sunken text-content-muted border border-border-subtle">
                              <LogOut className="w-2.5 h-2.5 text-content-subtle" />
                              {t("sessionMonitor.statusLoggedOut", "Sudah Keluar")}
                            </span>
                            <span className="text-[10px] text-content-subtle block mt-0.5">
                              {formatDate(session.logoutAt)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Activity Log Viewer Button */}
                          <button
                            onClick={() =>
                              handleOpenActivityModal({
                                id: session.userId,
                                name: session.displayName || session.username || "User",
                                email: session.email || "",
                                role: session.role,
                                avatar: session.avatar,
                              })
                            }
                            className="p-1.5 text-content-subtle hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border border-transparent hover:border-primary/20"
                            title={t("sessionMonitor.viewActivities", "Lihat Log Aktivitas")}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Terminate Session Button (only for active sessions) */}
                          {isActive && (
                            <button
                              onClick={() => handleTerminateSession(session)}
                              disabled={terminatingId === session.id}
                              className="p-1.5 text-content-subtle hover:text-danger hover:bg-danger/10 rounded-lg transition-colors border border-transparent hover:border-danger/20 disabled:opacity-50"
                              title={t("sessionMonitor.terminateBtn", "Putuskan Sesi")}
                            >
                              <LogOut
                                className={`w-4 h-4 ${terminatingId === session.id ? "animate-spin" : ""}`}
                              />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* #309 — kartu sesi di bawah sm */}
        <div className="sm:hidden divide-y divide-border-subtle/60 min-h-[350px]">
          {loading ? (
            <div className="py-12 text-center text-content-subtle">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              <span>{t("sessionMonitor.loading", "Memuat data sesi pengguna...")}</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-content-subtle px-4">
              <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-content-subtle opacity-50" />
              <p className="font-medium text-content-strong">
                {t("sessionMonitor.noData", "Tidak ada sesi pengguna ditemukan")}
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.status === "ACTIVE";
              const isMobile = isMobileDevice(session.device, session.os);
              const ip = (session.ipAddress || "").replace(/^::ffff:/, "").trim();
              const isLocal =
                !ip ||
                ip === "127.0.0.1" ||
                ip === "::1" ||
                ip === "localhost" ||
                ip.startsWith("192.168.") ||
                ip.startsWith("10.") ||
                ip.startsWith("172.16.");
              const locationLabel = isLocal
                ? session.location || "Local Network"
                : session.location ||
                  (session.city && session.country
                    ? `${session.city}, ${session.country}`
                    : session.city || session.country || "Jakarta, ID");

              return (
                <div key={session.id} className="p-3.5 flex flex-col gap-2.5 bg-surface">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        name={session.displayName || session.username || "User"}
                        src={session.avatar || undefined}
                        size="md"
                      />
                      <div className="min-w-0">
                        <span className="font-semibold text-content-strong text-sm block truncate">
                          {session.displayName ||
                            session.username ||
                            t("sessionMonitor.unnamed", "Tanpa Nama")}
                        </span>
                        <span className="text-xs text-content-subtle block truncate">
                          {session.email || session.username || "-"}
                        </span>
                      </div>
                    </div>
                    {isActive ? (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {t("sessionMonitor.statusActive", "Sesi Aktif")}
                      </span>
                    ) : session.status === "FORCE_LOGOUT" || session.status === "TERMINATED" ? (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/10 text-danger border border-danger/20">
                        {t("sessionMonitor.statusForceLogout", "Diputus Admin")}
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-sunken text-content-muted border border-border-subtle">
                        {t("sessionMonitor.statusLoggedOut", "Sudah Keluar")}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-content-muted">
                    <span className="inline-flex items-center gap-1 font-mono text-content-strong">
                      <Globe className="w-3 h-3 text-primary" />
                      {session.ipAddress || "127.0.0.1"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {locationLabel}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {isMobile ? (
                        <Smartphone className="w-3 h-3 text-info" />
                      ) : (
                        <Laptop className="w-3 h-3 text-primary" />
                      )}
                      {session.browser || "Unknown"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(session.loginAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenActivityModal({
                          id: session.userId,
                          name: session.displayName || session.username || "User",
                          email: session.email || "",
                          role: session.role,
                          avatar: session.avatar,
                        })
                      }
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {t("sessionMonitor.viewActivities", "Lihat Log Aktivitas")}
                    </button>
                    {isActive && (
                      <button
                        type="button"
                        onClick={() => handleTerminateSession(session)}
                        disabled={terminatingId === session.id}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-danger bg-danger/5 border border-danger/20 rounded-lg disabled:opacity-50 cursor-pointer"
                      >
                        <LogOut
                          className={`w-3.5 h-3.5 ${terminatingId === session.id ? "animate-spin" : ""}`}
                        />
                        {t("sessionMonitor.terminateBtn", "Putuskan")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Card Footer Pagination */}
        <div className="p-4 border-t border-border-subtle bg-surface flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-content-subtle font-medium">
            {t("sessionMonitor.pageInfo", "Halaman {{page}} dari {{totalPages}}", {
              page,
              totalPages,
            })}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-content-strong bg-surface hover:bg-surface-hover border border-border-subtle rounded-lg disabled:opacity-40 transition-all shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{t("sessionMonitor.prev", "Sebelumnya")}</span>
            </button>

            <span className="px-3 py-1 bg-surface-sunken border border-border-subtle rounded-lg text-xs font-bold text-content-strong">
              {page}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-content-strong bg-surface hover:bg-surface-hover border border-border-subtle rounded-lg disabled:opacity-40 transition-all shadow-xs"
            >
              <span>{t("sessionMonitor.next", "Berikutnya")}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Velzon Activity & Audit Log Viewer Modal */}
      {selectedUserForActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/60 backdrop-blur-xs">
          <div className="bg-surface border border-border-subtle rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-border-subtle bg-surface flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={selectedUserForActivity.name}
                  src={selectedUserForActivity.avatar || undefined}
                  size="lg"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-content-strong">
                      {selectedUserForActivity.name}
                    </h2>
                    {selectedUserForActivity.role && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-normal uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                        {selectedUserForActivity.role}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-content-subtle">{selectedUserForActivity.email}</p>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-content-subtle hover:text-content-strong hover:bg-surface-sunken transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Activity Log Timeline */}
            <div className="p-6 overflow-y-auto flex-1 bg-surface-sunken space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-normal uppercase tracking-wider text-content-subtle flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  {t("sessionMonitor.activityFeedTitle", "Riwayat Aktivitas & Audit Log")}
                </h3>
                <span className="text-xs text-content-subtle">
                  {userActivities.length} {t("sessionMonitor.entries", "Entri Terakhir")}
                </span>
              </div>

              {loadingActivities ? (
                <div className="py-12 text-center text-content-subtle">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  <span>
                    {t("sessionMonitor.loadingActivities", "Memuat riwayat aktivitas...")}
                  </span>
                </div>
              ) : userActivities.length === 0 ? (
                <div className="py-12 text-center text-content-subtle bg-surface border border-border-subtle rounded-xl p-6">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-content-subtle opacity-50" />
                  <p className="font-medium text-content-strong text-sm">
                    {t(
                      "sessionMonitor.noActivities",
                      "Belum ada riwayat aktivitas dicatat untuk pengguna ini."
                    )}
                  </p>
                </div>
              ) : (
                <div className="relative border-l-2 border-border-subtle ml-2 pl-6 space-y-6">
                  {userActivities.map((act) => {
                    const actionType = (act.action || "").toUpperCase();
                    const isUpdate = actionType.includes("UPDATE");
                    const isDelete = actionType.includes("DELETE");
                    const isCreate = actionType.includes("CREATE") || actionType.includes("INSERT");

                    const actionBadgeBg = isDelete
                      ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                      : isCreate
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : isUpdate
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : "bg-primary/10 text-primary border-primary/20";

                    const oldObj = act.oldValues || (act.changes?.old ? act.changes.old : null);
                    const newObj =
                      act.newValues ||
                      (act.changes?.new
                        ? act.changes.new
                        : act.changes && !act.changes.details
                          ? act.changes
                          : null);

                    const formatDiffVal = (val: any) => {
                      if (val === null || val === undefined || val === "null" || val === "")
                        return "-";
                      if (typeof val === "object") return JSON.stringify(val);
                      return String(val);
                    };

                    const humanFieldMap: Record<string, string> = {
                      displayName: t("sessionMonitor.fieldDisplayName", "Nama Tampilan"),
                      name: t("sessionMonitor.fieldName", "Nama Lengkap"),
                      email: t("sessionMonitor.fieldEmail", "Alamat Email"),
                      username: t("sessionMonitor.fieldUsername", "Nama Pengguna"),
                      role: t("sessionMonitor.fieldRole", "Peran Sistem"),
                      status: t("sessionMonitor.fieldStatus", "Status Akun"),
                      department: t("sessionMonitor.fieldDepartment", "Departemen"),
                      position: t("sessionMonitor.fieldPosition", "Jabatan"),
                      phone: t("sessionMonitor.fieldPhone", "Nomor Telepon"),
                      bio: t("sessionMonitor.fieldBio", "Bio Profil"),
                    };

                    const ignoredDbFields = new Set([
                      "id",
                      "uid",
                      "userId",
                      "avatar",
                      "avatar_url",
                      "photoURL",
                      "lastSeen",
                      "createdAt",
                      "updatedAt",
                      "passwordHash",
                      "password",
                      "token",
                      "permissions",
                      "nama_lengkap",
                    ]);

                    const rawKeys = Array.from(
                      new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])
                    ).filter((k) => !ignoredDbFields.has(k));

                    // Murni Before-After Diff Engine: HANYA tampilkan bidang yang BENAR-BENAR BERUBAH
                    const activeKeys = rawKeys.filter((key) => {
                      if (!oldObj || !newObj) return true;
                      const oldHas =
                        Object.prototype.hasOwnProperty.call(oldObj, key) &&
                        oldObj[key] !== undefined;
                      const newHas =
                        Object.prototype.hasOwnProperty.call(newObj, key) &&
                        newObj[key] !== undefined;
                      // Pada pembaruan parsial (UPDATE), jika bidang tidak dikirim di newObj, abaikan
                      if (isUpdate && (!oldHas || !newHas)) return false;
                      const o = formatDiffVal(oldObj[key]);
                      const n = formatDiffVal(newObj[key]);
                      return o !== n && (o !== "-" || n !== "-");
                    });

                    const narrativeText = isDelete
                      ? t("sessionMonitor.actNarrativeDelete", "Menghapus entitas / data pengguna")
                      : isCreate
                        ? t(
                            "sessionMonitor.actNarrativeCreate",
                            "Membuat data / akun pengguna baru"
                          )
                        : isUpdate
                          ? t(
                              "sessionMonitor.actNarrativeUpdate",
                              "Memperbarui profil atau setelan pengguna"
                            )
                          : t(
                              "sessionMonitor.actNarrativeGeneral",
                              "Aktivitas tercatat pada akun ini"
                            );

                    return (
                      <div key={act.id} className="relative group">
                        {/* Timeline Node Icon */}
                        <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-surface border-2 border-primary flex items-center justify-center shrink-0 shadow-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        </div>

                        {/* Event Card */}
                        <div className="bg-surface border border-border-subtle rounded-xl p-4 shadow-xs hover:border-primary/40 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-border-subtle">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-normal border uppercase tracking-wider ${actionBadgeBg}`}
                              >
                                {act.action}
                              </span>
                              {act.entity && (
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-sunken text-content-strong border border-border-subtle">
                                  {act.entity}
                                </span>
                              )}
                              {act.entityId && (
                                <span className="text-[11px] font-mono text-content-subtle hidden md:inline">
                                  #{act.entityId.slice(0, 8)}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-medium text-content-subtle shrink-0 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-content-subtle" />
                              {formatDate(act.createdAt)}
                            </span>
                          </div>

                          {/* Narasi Manusiawi */}
                          <p className="text-xs font-medium text-content-strong mb-2">
                            {narrativeText}
                          </p>

                          {/* Visual Diff Table Viewer (Ramah Manusia ala Jira) */}
                          {activeKeys.length > 0 ? (
                            <div className="mt-3 overflow-x-auto border border-border-subtle rounded-lg bg-surface-sunken">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-border-subtle text-[11px] font-normal uppercase tracking-wider text-content-subtle bg-surface/50">
                                    <th className="py-1.5 px-3">
                                      {t("sessionMonitor.fieldHeader", "Properti")}
                                    </th>
                                    <th className="py-1.5 px-3">
                                      {t("sessionMonitor.beforeHeader", "Nilai Sebelum")}
                                    </th>
                                    <th className="py-1.5 px-3">
                                      {t("sessionMonitor.afterHeader", "Nilai Sesudah")}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border-subtle font-sans text-xs">
                                  {activeKeys.map((key) => {
                                    const oldVal = formatDiffVal(oldObj ? oldObj[key] : undefined);
                                    const newVal = formatDiffVal(newObj ? newObj[key] : undefined);
                                    const humanLabel = humanFieldMap[key] || key;
                                    return (
                                      <tr key={key} className="hover:bg-surface/40">
                                        <td className="py-2 px-3 font-semibold text-content-strong">
                                          {humanLabel}
                                        </td>
                                        <td className="py-2 px-3 text-rose-600 bg-rose-500/5 font-medium">
                                          {oldVal}
                                        </td>
                                        <td className="py-2 px-3 text-emerald-600 bg-emerald-500/5 font-semibold">
                                          {newVal}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : act.changes?.details ? (
                            <div className="mt-2 p-2.5 bg-surface-sunken border border-border-subtle rounded-lg text-xs text-content-strong font-mono">
                              {typeof act.changes.details === "object"
                                ? JSON.stringify(act.changes.details, null, 2)
                                : String(act.changes.details)}
                            </div>
                          ) : (
                            <p className="text-xs text-content-subtle italic mt-1">
                              {t(
                                "sessionMonitor.noDiffRecorded",
                                "Perubahan tersimpan dengan sukses."
                              )}
                            </p>
                          )}

                          {/* Card Footer: Metadata IP & UserAgent */}
                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-content-subtle mt-3 pt-2 border-t border-border-subtle">
                            <div className="flex items-center gap-3">
                              {act.ipAddress && (
                                <span className="flex items-center gap-1 font-mono text-[11px] text-content-muted">
                                  <Globe className="w-3 h-3 text-primary shrink-0" />
                                  {act.ipAddress}
                                </span>
                              )}
                              {act.userAgent && (
                                <span
                                  className="hidden sm:inline text-[11px] text-content-subtle truncate max-w-[200px]"
                                  title={act.userAgent}
                                >
                                  {act.userAgent}
                                </span>
                              )}
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-normal uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                              {act.source}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border-subtle bg-surface flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-xs font-semibold text-content-strong bg-surface hover:bg-surface-hover border border-border-subtle rounded-lg transition-colors shadow-xs"
              >
                {t("sessionMonitor.closeModal", "Tutup")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
