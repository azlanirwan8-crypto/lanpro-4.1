import { useTranslation } from "react-i18next";
import React, { useState, useMemo, useEffect } from "react";
import { katalogPeranProyek, labelPeran } from "../../lib/roleCatalog";
import {
  Users,
  LayoutGrid,
  List,
  Search,
  Download,
  ChevronDown,
  CheckCircle2,
  Clock,
  X,
  Star,
  Briefcase,
  Trash2,
} from "lucide-react";
import { UserProfile, Project, Task, AppRole, PeranEfektif, MasterData } from "../../types";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { ConfirmationModal } from "../../components/ui/ConfirmationModal";
import { toast } from "sonner";
// Diberi alias: komponen sudah punya fungsi lokal bernama fetchTeamTasks yang
// membungkus state loading dan penanganan unmount.
import { fetchTeamTasks as fetchTeamTasksApi } from "./services/team.service";
import { ResponsiveTable } from "../../components/ResponsiveTable";
import { StyledDropdown as CommonStyledDropdown } from "../../components/ui/CommonComponents";
import { safeLocalStorage } from "../../lib/safeStorage";

export const TeamManagementPanel = ({
  projectMembers: propMembers,
  selectedProject,
  tasks: propTasks,
  currentUserProfile,
  userRole,
  hasPermission,
  updateProjectRole,
  removeProjectMember,
  masterData: propMaster,
  onRefreshProjects,
}: {
  projectMembers: UserProfile[];
  selectedProject: Project | null;
  tasks: Task[];
  currentUserProfile?: UserProfile | null;
  userRole?: PeranEfektif | null;
  hasPermission?: (...args: any[]) => boolean;
  StyledDropdown?: any;
  updateProjectRole?: (uid: string, role: string) => void;
  removeProjectMember?: (uid: string) => Promise<void>;
  masterData?: MasterData[];
  onRefreshProjects?: () => void;
}) => {
  const { t } = useTranslation();
  const [teamSearch, setTeamSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedProfileUser, setSelectedProfileUser] = useState<any | null>(null);
  const [teamTasks, setTeamTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<any | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const isGlobalAdmin =
    currentUserProfile?.role === "admin" || (currentUserProfile as any)?.systemRole === "admin";

  /**
   * Izin di sini datang dari CEKLIST, bukan dari peran proyek (#298).
   *
   * Versi sebelumnya berbunyi:
   *
   *   canManageTeam = isGlobalAdmin
   *                   ATAU peran === "owner"
   *                   ATAU peran === "admin"
   *                   ATAU hasPermission("access", "U")
   *
   * Karena rantainya OR, akun berperan `owner`/`admin` di proyek langsung
   * lolos dan `hasPermission` TIDAK PERNAH dipanggil. Pemilik proyek
   * melaporkannya: ceklist "Akses Tim & Proyek" hanya READ, tetapi tombol
   * hapus dan pemilih peran tetap muncul.
   *
   * Aturan yang disepakati — terdokumentasi di `issuePermissions.ts` sejak
   * #202 — adalah: hak CRUD datang dari ceklist ATAU dari kepemilikan item,
   * dan hanya Global Admin yang berakses penuh. Peran proyek bukan jalur
   * ketiga.
   *
   * UPDATE dan DELETE juga DIPISAH. Sebelumnya keduanya memakai satu bendera
   * yang menanyakan izin "U", sehingga akun yang hanya boleh mengubah peran
   * ikut mendapat tombol keluarkan anggota — izin "D" tidak pernah diperiksa
   * di mana pun.
   *
   * #331 — `hasPermission` dari `permissions.ts` (dan yang diteruskan
   * AppContainer) butuh (peran, modul, aksi, …). Memanggil
   * hasPermission("access", "U") membuat argumen aksi jadi undefined dan
   * melempar TypeError di toLowerCase — crash modul Tim untuk non-admin.
   */
  const punyaIzin = (aksi: "U" | "D") => {
    if (typeof hasPermission !== "function") return false;
    const action = aksi === "U" ? "update" : "delete";
    return Boolean(
      hasPermission(
        userRole as any,
        "access",
        action,
        false,
        (currentUserProfile as any)?.permissions
      )
    );
  };

  const bolehUbahPeran = isGlobalAdmin || punyaIzin("U");
  const bolehKeluarkanAnggota = isGlobalAdmin || punyaIzin("D");

  const handleConfirmRemove = async () => {
    if (!memberToRemove || !removeProjectMember) return;
    const targetUid = memberToRemove.uid || memberToRemove.id;
    if (!targetUid) return;
    setIsRemoving(true);
    try {
      await removeProjectMember(targetUid);
      setMemberToRemove(null);
      if (onRefreshProjects) onRefreshProjects();
    } catch (e: any) {
      console.error("Error removing member:", e);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRoleChange = async (member: any, newRole: string) => {
    if (!updateProjectRole) return;
    const targetUid = member.uid || member.id;
    if (!targetUid) return;
    try {
      await updateProjectRole(targetUid, newRole);
      if (onRefreshProjects) onRefreshProjects();
    } catch (e: any) {
      console.error("Error updating member role:", e);
    }
  };

  useEffect(() => {
    if (!selectedProject?.id) {
      setTeamTasks([]);
      return;
    }

    let isMounted = true;
    const fetchTeamTasks = async () => {
      setIsLoadingTasks(true);
      try {
        const res = await fetchTeamTasksApi(selectedProject.id);
        if (res.status === "success" && isMounted) {
          setTeamTasks(res.data || []);
        }
      } catch (err) {
        console.error("Error fetching team tasks:", err);
      } finally {
        if (isMounted) setIsLoadingTasks(false);
      }
    };

    fetchTeamTasks();
    return () => {
      isMounted = false;
    };
  }, [selectedProject?.id]);

  const rawMembers = Array.isArray(propMembers) ? propMembers : [];
  const tasks = teamTasks.length > 0 ? teamTasks : Array.isArray(propTasks) ? propTasks : [];
  const masterData = Array.isArray(propMaster) ? propMaster : [];

  // #82 — peran proyek dibaca dari Master Data.
  const peranProyek = React.useMemo(() => katalogPeranProyek(masterData), [masterData]);

  const roleFilterOptions = React.useMemo(() => {
    const allOpt = { id: "all", label: t("teamPanel.allRoles"), icon: "Users", color: "#6366F1" };
    const list = peranProyek.map((p) => ({
      id: p.code,
      label: p.label,
      icon:
        p.code === "pm" || p.code === "owner"
          ? "Crown"
          : p.code === "lead"
            ? "ShieldCheck"
            : "UserCheck",
      color: p.code === "pm" || p.code === "owner" ? "#F59E0B" : "#3B82F6",
    }));
    return [allOpt, ...list];
  }, [peranProyek, t]);

  const memberRoleDropdownOptions = React.useMemo(() => {
    return peranProyek.map((p) => ({
      id: p.code,
      label: p.label,
      icon:
        p.code === "pm" || p.code === "owner"
          ? "Crown"
          : p.code === "lead"
            ? "ShieldCheck"
            : "UserCheck",
      color: p.code === "pm" || p.code === "owner" ? "#F59E0B" : "#3B82F6",
    }));
  }, [peranProyek]);

  const getUserTasks = (person: any) => {
    if (!person) return [];
    const pIds = [
      person.uid,
      person.id,
      person.userId,
      person.email,
      person.username,
      person.displayName,
    ].filter(Boolean);
    return tasks.filter((t) => {
      if (!t) return false;
      // Exclude Epic tasks from member task calculations and list views
      if (String(t.type || "").toLowerCase() === "epic") return false;

      const aid = t.assigneeId;
      const aEmail = t.assigneeEmail;
      const assignees = t.assignees || [];
      return (
        (aid && pIds.some((id) => String(id).toLowerCase() === String(aid).toLowerCase())) ||
        (aEmail &&
          person.email &&
          String(aEmail).toLowerCase() === String(person.email).toLowerCase()) ||
        (Array.isArray(assignees) &&
          assignees.some((aId) =>
            pIds.some((id) => String(id).toLowerCase() === String(aId).toLowerCase())
          ))
      );
    });
  };

  // Filter strictly to users who have joined the selected project
  const joinedMembers = useMemo(() => {
    if (!selectedProject) return rawMembers;

    const projectOwnerId = selectedProject.ownerId;
    const projectMemberList = Array.isArray(selectedProject.members) ? selectedProject.members : [];
    const projectRolesMap = selectedProject.memberRoles || {};

    const hasExplicitMembers =
      projectMemberList.length > 0 ||
      Object.keys(projectRolesMap).length > 0 ||
      Boolean(projectOwnerId);

    if (!hasExplicitMembers) return rawMembers;

    const filtered = rawMembers.filter((m) => {
      const uid = m.uid || (m as any).id;
      if (!uid) return false;
      const isOwner = projectOwnerId === uid;
      const isMember = projectMemberList.includes(uid);
      const hasRole = Object.prototype.hasOwnProperty.call(projectRolesMap, uid);
      return isOwner || isMember || hasRole;
    });

    return filtered.length > 0 ? filtered : rawMembers;
  }, [rawMembers, selectedProject]);

  const allPeople = useMemo(() => {
    const active = joinedMembers.map((m) => ({ ...m, isPending: false }));
    const pending = (selectedProject?.pendingInvites || []).map((email: string) => ({
      uid: email,
      email,
      displayName: email.split("@")[0],
      isPending: true,
    }));
    return [...active, ...pending];
  }, [joinedMembers, selectedProject]);

  // Filtered people based on search and role filter
  const filteredPeople = useMemo(() => {
    return allPeople.filter((p) => {
      const search = teamSearch.toLowerCase();
      const pUser = p as any;
      const matchesSearch =
        p?.displayName?.toLowerCase().includes(search) ||
        p?.email?.toLowerCase().includes(search) ||
        pUser?.username?.toLowerCase().includes(search) ||
        pUser?.role?.toLowerCase().includes(search);

      const role = selectedProject?.memberRoles?.[p.uid] || pUser?.role || "viewer";
      const matchesRole = roleFilter === "all" || role.toLowerCase() === roleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [allPeople, teamSearch, roleFilter, selectedProject]);

  const activeTeamCount = joinedMembers.length;
  const pendingInvitesCount = (selectedProject?.pendingInvites || []).length;
  const assignedTasksCount = tasks.filter(
    (t) => t.assigneeId && String(t.type || "").toLowerCase() !== "epic"
  ).length;
  const projectTasksCount = tasks.filter(
    (t) => String(t.type || "").toLowerCase() !== "epic"
  ).length;

  const handleExportTeamCSV = () => {
    try {
      if (filteredPeople.length === 0) {
        toast.error(t("toast.noTeamToExport"));
        return;
      }

      const headers = [
        t("team.csvUidEmail"),
        t("team.csvFullName"),
        t("team.csvUsername"),
        t("team.projectRole"),
        t("team.status"),
        t("team.csvTaskCount"),
      ];
      const rows = filteredPeople.map((p) => {
        const role = selectedProject?.memberRoles?.[p.uid] || (p as any)?.role || "viewer";
        const isPending = p.isPending;
        const userAssignedTasks = getUserTasks(p);
        const taskCount = userAssignedTasks.length;
        return [
          p.uid,
          p?.displayName || "",
          (p as any)?.username || "",
          role,
          isPending ? "Pending" : "Active",
          taskCount,
        ];
      });

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
        `team_members_${selectedProject?.key || "project"}_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t("toast.teamExported", { count: filteredPeople.length }));
    } catch (e) {
      console.error(e);
      toast.error(t("toast.csvExportFailed"));
    }
  };

  return (
    <div className="p-4 md:p-6 w-full h-[calc(100vh-80px)] flex flex-col overflow-hidden text-left">
      {/* Fixed Top Section Wrapper */}
      <div className="shrink-0 space-y-5 pb-1">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-medium text-content-strong tracking-tight">
              {t("team.title")}
            </h1>
            <p className="text-xs text-content-muted font-medium mt-0.5">
              {t("team.membersOf")}{" "}
              {selectedProject ? (
                <span className="font-medium text-content-body">
                  {selectedProject.name}
                  {selectedProject.key ? ` (${selectedProject.key})` : ""}
                </span>
              ) : (
                ""
              )}
            </p>
          </div>
        </div>

        {/* Team Summary KPI Cards — #333: 2 kolom sejak HP (bukan menunggu sm:) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
          <div className="bg-surface p-3 md:p-4 rounded-lg border border-border-subtle/80 shadow-2xs flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] md:text-xs font-normal text-content-subtle uppercase tracking-wider truncate">
                  {t("team.activeTeam")}
                </div>
                <div className="text-lg md:text-xl font-medium text-content-strong mt-0.5">
                  {activeTeamCount}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface p-3 md:p-4 rounded-lg border border-border-subtle/80 shadow-2xs flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] md:text-xs font-normal text-content-subtle uppercase tracking-wider truncate">
                  {t("team.assignedTasks")}
                </div>
                <div className="text-lg md:text-xl font-medium text-content-strong mt-0.5">
                  {assignedTasksCount}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface p-3 md:p-4 rounded-lg border border-border-subtle/80 shadow-2xs flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-500/10 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] md:text-xs font-normal text-content-subtle uppercase tracking-wider truncate">
                  {t("team.pendingInvites")}
                </div>
                <div className="text-lg md:text-xl font-medium text-content-strong mt-0.5">
                  {pendingInvitesCount}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface p-3 md:p-4 rounded-lg border border-border-subtle/80 shadow-2xs flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-500/10 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] md:text-xs font-normal text-content-subtle uppercase tracking-wider truncate">
                  {t("team.projectTasks")}
                </div>
                <div className="text-lg md:text-xl font-medium text-content-strong mt-0.5">
                  {projectTasksCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & View Mode Control Bar — #333: wrap rapat di HP */}
        <div className="bg-surface p-2.5 md:p-3.5 rounded-lg border border-border-subtle/80 shadow-2xs flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
          <div className="relative flex-1 w-full min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-content-subtle" />
            <input
              type="text"
              placeholder={t("team.searchPlaceholder")}
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-surface-sunken border border-border-subtle rounded-md text-xs focus:ring-1 focus:ring-indigo-500 focus:bg-surface outline-none text-content-body font-medium transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-nowrap justify-between md:justify-end min-w-0">
            <div className="min-w-0 flex-1 md:flex-none md:min-w-[160px]">
              <CommonStyledDropdown
                value={roleFilter}
                onChange={(val: string) => setRoleFilter(val)}
                options={roleFilterOptions}
                masterData={masterData}
                className="w-full"
                buttonClassName="h-8 bg-surface-sunken rounded-md border border-border-subtle hover:border-border-subtle px-2.5 text-xs font-medium text-content-body"
              />
            </div>

            {/* Grid vs List View Mode Buttons */}
            <div className="flex bg-surface-muted p-0.5 rounded-md border border-border-subtle/80">
              <button
                onClick={() => setViewMode("grid")}
                className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded transition-all ${viewMode === "grid" ? "bg-primary-surface text-content-inverse shadow-2xs" : "text-content-muted hover:text-content-strong"}`}
                title={t("team.gridView")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded transition-all ${viewMode === "list" ? "bg-primary-surface text-content-inverse shadow-2xs" : "text-content-muted hover:text-content-strong"}`}
                title={t("team.listView")}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleExportTeamCSV}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-surface-muted hover:bg-surface-strong text-content-body border border-border-subtle rounded-md text-xs font-medium shadow-2xs transition-all cursor-pointer shrink-0"
              title={t("team.exportCsv")}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("team.exportCsv")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Container for Card Grid or List */}
      <div className="flex-1 overflow-y-auto pb-24 md:pb-32 space-y-5 pr-1 mt-3 custom-scrollbar">
        {/* Grid View Mode - Match Velzon Team Cards */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            {filteredPeople.map((person: any, i) => {
              const name = person?.displayName || person?.email || "Unknown Member";
              const initialsMatch = name.match(/\b\w/g);
              const initials = (initialsMatch ? initialsMatch.join("") : name.substring(0, 2))
                .substring(0, 2)
                .toUpperCase();
              // #82 — label dari katalog Master Data, bukan nilai mentah.
              const roleName = labelPeran(
                peranProyek,
                selectedProject?.memberRoles?.[person.uid] || person?.role
              );
              const userAssignedTasks = getUserTasks(person);
              const completedTasks = userAssignedTasks.filter((t) => {
                const st = String(t.status || "").toUpperCase();
                return st === "DONE" || st === "SELESAI" || st === "COMPLETED" || st === "FINISH";
              });
              const isOwner =
                selectedProject?.ownerId === person.uid || selectedProject?.ownerId === person.id;
              const personUid = person.uid || person.id || "";
              const personCover = safeLocalStorage.getItem(`user_cover_${personUid}`);

              return (
                <div
                  key={person.uid || i}
                  className="bg-surface rounded-lg border border-border-subtle/80 shadow-2xs overflow-hidden flex flex-col hover:border-indigo-500/30 transition-all duration-200 group min-w-0"
                >
                  {/* Banner — lebih pendek di HP (#333) */}
                  <div
                    className="h-10 md:h-16 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 relative p-1.5 md:p-2.5 flex items-start justify-end bg-cover bg-center transition-all"
                    style={personCover ? { backgroundImage: `url(${personCover})` } : undefined}
                  >
                    {personCover && <div className="absolute inset-0 bg-overlay/20" />}
                    <Star className="w-3.5 h-3.5 md:w-4 md:h-4 text-content-inverse/50 hover:text-amber-300 cursor-pointer transition-colors relative z-10" />
                  </div>

                  <div className="relative -mt-5 md:-mt-8 mx-auto z-10">
                    <UserAvatar
                      user={person}
                      className="w-12 h-12 md:w-16 md:h-16 border-4 border-surface shadow-md text-sm md:text-base"
                    />
                    <div
                      className={`w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full border-2 border-surface absolute bottom-0 right-0 shadow-2xs ${
                        person.isPending ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    />
                  </div>

                  <div className="p-2 md:p-4 pt-1.5 md:pt-2 text-center flex-1 flex flex-col justify-between gap-1">
                    <div className="min-w-0">
                      <h3 className="font-medium text-content-strong text-xs md:text-sm leading-snug truncate group-hover:text-indigo-600 transition-colors">
                        {name}
                      </h3>
                      {bolehUbahPeran && !isOwner ? (
                        <div className="mt-1 flex justify-center w-full max-w-full md:max-w-[140px] mx-auto">
                          <CommonStyledDropdown
                            value={
                              selectedProject?.memberRoles?.[person.uid] ||
                              selectedProject?.memberRoles?.[person.id] ||
                              person?.role ||
                              "developer"
                            }
                            onChange={(val: string) => handleRoleChange(person, val)}
                            options={memberRoleDropdownOptions}
                            masterData={masterData}
                            className="w-full"
                            buttonClassName="h-7 bg-surface-sunken rounded border border-border-subtle hover:border-border-subtle px-1.5 md:px-2 text-[10px] md:text-xs font-medium text-content-body"
                          />
                        </div>
                      ) : (
                        <p className="text-[10px] md:text-xs font-medium text-content-muted capitalize mt-0.5 truncate">
                          {isOwner ? "Project Owner & Manager" : roleName}
                        </p>
                      )}
                    </div>

                    <div className="border-t border-border-faint my-1.5 md:my-3 pt-1.5 md:pt-3 grid grid-cols-2 gap-1 md:gap-2 text-center">
                      <div className="bg-surface-sunken p-1 md:p-2 rounded-md border border-border-faint">
                        <span className="block font-medium text-content-strong text-xs md:text-sm">
                          {userAssignedTasks.length}
                        </span>
                        <span className="text-[9px] md:text-[10px] text-content-subtle font-normal uppercase tracking-wider truncate block">
                          {t("teamPanel.assigned")}
                        </span>
                      </div>
                      <div className="bg-surface-sunken p-1 md:p-2 rounded-md border border-border-faint">
                        <span className="block font-medium text-content-strong text-xs md:text-sm">
                          {completedTasks.length}
                        </span>
                        <span className="text-[9px] md:text-[10px] text-content-subtle font-normal uppercase tracking-wider truncate block">
                          {t("teamPanel.done")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 md:gap-2">
                      <button
                        onClick={() => setSelectedProfileUser(person)}
                        className="flex-1 py-1.5 md:py-2 bg-surface-muted hover:bg-indigo-500/10 hover:text-indigo-600 text-content-body text-[10px] md:text-xs font-medium rounded-md transition-colors border border-border-subtle/70 shadow-2xs cursor-pointer truncate px-1"
                      >
                        {t("team.viewProfile")}
                      </button>
                      {bolehKeluarkanAnggota &&
                        !isOwner &&
                        person.uid !== currentUserProfile?.uid &&
                        person.id !== currentUserProfile?.id && (
                          <button
                            onClick={() => setMemberToRemove(person)}
                            title={t("team.removeMember")}
                            aria-label={t("team.removeMember")}
                            className="p-1.5 md:p-2 bg-surface-muted hover:bg-rose-500/10 hover:text-rose-600 text-content-muted text-xs font-medium rounded-md transition-colors border border-border-subtle/70 shadow-2xs cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List View Mode - Sleek Table / Cards */}
        {viewMode === "list" && (
          <div className="bg-surface rounded-lg border border-border-subtle/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <ResponsiveTable className="w-full text-left">
                <thead>
                  <tr className="bg-surface-sunken/80 border-b border-border-subtle/80 text-xs sm:text-[11px] font-normal text-content-muted uppercase tracking-wider">
                    <th className="px-5 py-3">{t("team.member")}</th>
                    <th className="px-5 py-3">{t("team.role")}</th>
                    <th className="px-5 py-3 text-center">{t("team.assignedTasks")}</th>
                    <th className="px-5 py-3 text-center">{t("team.completed")}</th>
                    <th className="px-5 py-3 text-center">{t("team.status")}</th>
                    <th className="px-5 py-3 text-right">{t("team.action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-faint">
                  {filteredPeople.map((person: any, i) => {
                    const name = person?.displayName || person?.email || "Unknown Member";
                    const initialsMatch = name.match(/\b\w/g);
                    const initials = (initialsMatch ? initialsMatch.join("") : name.substring(0, 2))
                      .substring(0, 2)
                      .toUpperCase();
                    // #82 — label dari katalog Master Data.
                    const roleName = labelPeran(
                      peranProyek,
                      selectedProject?.memberRoles?.[person.uid] || person?.role
                    );
                    const userAssignedTasks = getUserTasks(person);
                    const completedTasks = userAssignedTasks.filter((t) => {
                      const st = String(t.status || "").toUpperCase();
                      return (
                        st === "DONE" || st === "SELESAI" || st === "COMPLETED" || st === "FINISH"
                      );
                    });
                    const isOwner =
                      selectedProject?.ownerId === person.uid ||
                      selectedProject?.ownerId === person.id;

                    return (
                      <tr
                        key={person.uid || i}
                        className="hover:bg-surface-sunken/60 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <UserAvatar
                                user={person}
                                className="w-9 h-9 border border-border-subtle text-xs"
                              />
                              <div
                                className={`w-2.5 h-2.5 rounded-full border border-surface absolute bottom-0 right-0 ${person.isPending ? "bg-amber-500" : "bg-emerald-500"}`}
                              />
                            </div>
                            <div>
                              <div className="font-medium text-content-strong text-xs">{name}</div>
                              <div className="text-xs sm:text-[11px] text-content-subtle font-medium">
                                {person?.email || "@" + (person?.username || person.uid)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {bolehUbahPeran && !isOwner ? (
                            <div className="w-[140px]">
                              <CommonStyledDropdown
                                value={
                                  selectedProject?.memberRoles?.[person.uid] ||
                                  selectedProject?.memberRoles?.[person.id] ||
                                  person?.role ||
                                  "developer"
                                }
                                onChange={(val: string) => handleRoleChange(person, val)}
                                options={memberRoleDropdownOptions}
                                masterData={masterData}
                                className="w-full"
                                buttonClassName="h-7 bg-surface-sunken rounded border border-border-subtle hover:border-border-subtle px-2 text-xs font-medium text-content-body"
                              />
                            </div>
                          ) : (
                            <span className="inline-flex px-2.5 py-[3px] rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-700 border border-indigo-500/30 capitalize">
                              {isOwner ? "Project Owner" : roleName}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center font-medium text-content-strong text-xs">
                          {userAssignedTasks.length}
                        </td>
                        <td className="px-5 py-3.5 text-center font-medium text-emerald-600 text-xs">
                          {completedTasks.length}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs sm:text-[10px] font-medium ${
                              person.isPending
                                ? "bg-amber-500/10 text-amber-700 border border-amber-500/30"
                                : "bg-emerald-500/10 text-emerald-700 border border-emerald-500/30"
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${person.isPending ? "bg-amber-500" : "bg-emerald-500"}`}
                            />
                            {person.isPending ? "Pending" : "Active"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedProfileUser(person)}
                              className="px-3 py-1 bg-surface-muted hover:bg-indigo-500/10 hover:text-indigo-600 text-content-body text-xs font-medium rounded-md transition-colors border border-border-subtle/70 shadow-2xs cursor-pointer"
                            >
                              {t("teamPanel.viewProfile")}
                            </button>
                            {bolehKeluarkanAnggota &&
                              !isOwner &&
                              person.uid !== currentUserProfile?.uid &&
                              person.id !== currentUserProfile?.id && (
                                <button
                                  onClick={() => setMemberToRemove(person)}
                                  title={t("team.removeMember")}
                                  aria-label={t("team.removeMember")}
                                  className="p-1.5 bg-surface-muted hover:bg-rose-500/10 hover:text-rose-600 text-content-muted text-xs font-medium rounded-md transition-colors border border-border-subtle/70 shadow-2xs cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </ResponsiveTable>
            </div>
          </div>
        )}

        {filteredPeople.length === 0 && (
          <div className="bg-surface rounded-lg border border-border-subtle/80 p-12 text-center text-content-subtle text-xs font-medium">
            {t("teamPanel.noMatch")}
          </div>
        )}
      </div>

      {/* View Profile Modal (View-Only) */}
      {selectedProfileUser &&
        (() => {
          const selectedUid = selectedProfileUser.uid || selectedProfileUser.id || "";
          const modalCover = safeLocalStorage.getItem(`user_cover_${selectedUid}`);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/40 backdrop-blur-xs">
              <div className="bg-surface rounded-xl border border-border-subtle shadow-xl max-w-md w-full overflow-hidden text-left">
                {/* Modal Cover */}
                <div
                  className="h-24 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 p-4 flex justify-end relative bg-cover bg-center"
                  style={modalCover ? { backgroundImage: `url(${modalCover})` } : undefined}
                >
                  {modalCover && <div className="absolute inset-0 bg-overlay/20" />}
                  <button
                    onClick={() => setSelectedProfileUser(null)}
                    className="w-7 h-7 rounded-full bg-surface/40 hover:bg-surface/60 text-content-strong flex items-center justify-center transition-colors cursor-pointer relative z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile Detail Content */}
                <div className="p-6 pt-0 relative">
                  <div className="-mt-12 mb-4 flex items-end justify-between">
                    <UserAvatar
                      user={selectedProfileUser}
                      className="w-20 h-20 border-4 border-surface shadow-md text-xl"
                    />
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 text-xs font-medium rounded-full border border-emerald-500/30">
                      {t("teamPanel.joinedProject")}
                    </span>
                  </div>

                  <h2 className="text-base font-medium text-content-strong">
                    {selectedProfileUser.displayName || "Anggota Tim"}
                  </h2>
                  <p className="text-xs text-content-muted font-medium">
                    {selectedProfileUser.email || "@" + selectedProfileUser.uid}
                  </p>

                  <div className="mt-4 p-3 bg-surface-sunken rounded-lg border border-border-subtle/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-content-subtle font-medium">
                        {t("teamPanel.projectRole")}
                      </span>
                      <span className="font-medium text-content-body capitalize">
                        {/* #82 — label dari katalog. */}
                        {labelPeran(
                          peranProyek,
                          selectedProject?.memberRoles?.[selectedProfileUser.uid] ||
                            selectedProfileUser.role
                        ) || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-content-subtle font-medium">
                        {t("teamPanel.assignedTasks")}
                      </span>
                      <span className="font-medium text-content-body">
                        {t("rakit.tasksCount", { count: getUserTasks(selectedProfileUser).length })}
                      </span>
                    </div>
                  </div>

                  {/* Task list preview */}
                  <div className="mt-4">
                    <h4 className="text-xs font-normal text-content-body uppercase tracking-wider mb-2">
                      {t("teamPanel.assignedTasksTitle")}
                    </h4>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                      {getUserTasks(selectedProfileUser).map((t) => (
                        <div
                          key={t.id}
                          className="p-2 bg-surface rounded border border-border-subtle/80 text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-[10px] leading-none font-medium text-indigo-600 bg-indigo-500/10 px-1 rounded">
                              {t.key}
                            </span>
                            <span className="truncate text-content-body font-medium">
                              {t.title}
                            </span>
                          </div>
                          <span className="text-xs sm:text-[10px] font-medium px-1.5 py-0.5 bg-surface-muted text-content-secondary rounded shrink-0">
                            {t.status}
                          </span>
                        </div>
                      ))}
                      {getUserTasks(selectedProfileUser).length === 0 && (
                        <p className="text-xs text-content-subtle italic">
                          {t("teamPanel.noAssignedTask")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setSelectedProfileUser(null)}
                      className="px-4 py-1.5 bg-surface-muted hover:bg-surface-strong text-content-body text-xs font-medium rounded-md transition-colors border border-border-subtle cursor-pointer"
                    >
                      {t("teamPanel.close")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Confirmation Modal for Member Removal */}
      {memberToRemove && (
        <ConfirmationModal
          isOpen={!!memberToRemove}
          onClose={() => setMemberToRemove(null)}
          onConfirm={handleConfirmRemove}
          title={t("team.removeMemberTitle")}
          message={t("team.confirmRemoveMember", {
            name: memberToRemove?.displayName || memberToRemove?.email || "anggota ini",
          })}
          confirmText={t("team.removeMember")}
          cancelText={t("users.cancel")}
          variant="danger"
          isLoading={isRemoving}
        />
      )}
    </div>
  );
};
