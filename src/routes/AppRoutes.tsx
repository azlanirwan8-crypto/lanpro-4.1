import React, { Suspense } from "react";
import { ShieldAlert, FolderKanban } from "lucide-react";
import type { PeranEfektif } from "../types/roles";
import type { Project, Sprint, Task, User } from "../types";
import { useAppStore } from "../store/useAppStore";
import { useProjectStore } from "../store";

/**
 * Tiap tampilan dimuat SAAT DIBUTUHKAN, bukan sekaligus di awal.
 *
 * MASALAH YANG DIPECAHKAN. Ketujuh belas modul di bawah dulu di-import statis,
 * sehingga seluruh fitur — flowchart, QA, notebook-lm, docx — ikut terkirim
 * pada permintaan pertama walaupun pengguna hanya membuka Dashboard. Bundel
 * utamanya mencapai 901 KB gzip dalam satu potongan, dan setiap fitur baru
 * memperburuknya.
 *
 * KENAPA AMAN. `switch (currentView)` di bawah hanya merender SATU tampilan
 * pada satu waktu. Tidak ada tampilan yang perlu hadir bersamaan, sehingga
 * memuatnya sesuai permintaan tidak mengubah perilaku apa pun.
 *
 * KENAPA ADA `.then(...)`. `React.lazy` hanya menerima modul dengan default
 * export, sementara repo ini memakai named export. Pembungkus itu menerjemahkan
 * keduanya. Nama di dalamnya HARUS sama persis dengan yang diekspor modulnya —
 * salah satu huruf saja membuat tampilan itu gagal dimuat, dan gagalnya baru
 * terlihat saat tampilan dibuka, bukan saat build.
 */
const DashboardView = React.lazy(() =>
  import("../features/dashboard").then((m) => ({ default: m.DashboardView }))
);
const IssueListView = React.lazy(() =>
  import("../features/issues").then((m) => ({ default: m.IssueListView }))
);
const PlanningView = React.lazy(() =>
  import("../features/planning").then((m) => ({ default: m.PlanningView }))
);
const BoardView = React.lazy(() =>
  import("../features/kanban/index").then((m) => ({ default: m.BoardView }))
);
const TestQAPanel = React.lazy(() =>
  import("../features/qa/TestQAPanel").then((m) => ({ default: m.TestQAPanel }))
);
const WikiView = React.lazy(() =>
  import("../features/wiki").then((m) => ({ default: m.WikiView }))
);
const MeetingNotes = React.lazy(() =>
  import("../features/meeting-notes/MeetingNotes").then((m) => ({ default: m.MeetingNotes }))
);
const NotebookLM = React.lazy(() =>
  import("../features/notebook-lm").then((m) => ({ default: m.NotebookLM }))
);
const FlowchartView = React.lazy(() =>
  import("../features/flowchart").then((m) => ({ default: m.FlowchartView }))
);
const MasterDataPanel = React.lazy(() =>
  import("../features/master/MasterDataPanel").then((m) => ({ default: m.MasterDataPanel }))
);
const ConnectPanel = React.lazy(() =>
  import("../features/connect/ConnectPanel").then((m) => ({ default: m.ConnectPanel }))
);
const EnterpriseAuditDashboard = React.lazy(() =>
  import("../features/enterprise-audit/EnterpriseAuditDashboard").then((m) => ({
    default: m.EnterpriseAuditDashboard,
  }))
);
const ActivityLogPanel = React.lazy(() =>
  import("../features/activity/ActivityLogPanel").then((m) => ({ default: m.ActivityLogPanel }))
);
const TimelinePanel = React.lazy(() =>
  import("../features/timeline/index").then((m) => ({ default: m.TimelinePanel }))
);
const TeamManagementPanel = React.lazy(() =>
  import("../features/team/TeamManagementPanel").then((m) => ({ default: m.TeamManagementPanel }))
);
const DbExplorerPanel = React.lazy(() =>
  import("../features/explorer/DbExplorerPanel").then((m) => ({ default: m.DbExplorerPanel }))
);
const SettingsPage = React.lazy(() =>
  import("../features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);

/**
 * Tampilan sementara selagi potongan kode diunduh.
 *
 * WAJIB ADA. Tanpa fallback, React melempar saat menemui komponen lazy yang
 * belum siap. Bentuknya sengaja tenang — indikator yang berisik justru terasa
 * seperti kerusakan pada pemuatan yang biasanya hanya sepersekian detik.
 */
const MemuatTampilan = () => (
  <div className="flex-1 flex flex-col items-center justify-center bg-surface-sunken/50 p-8">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-subtle border-t-primary" />
    <p className="mt-3 text-sm text-content-muted">Memuat...</p>
  </div>
);

export interface AppRoutesProps {
  currentView?: string;
  setCurrentView?: (view: any) => void;
  selectedProject?: Project | null;
  /** Peran yang berlaku — lingkup SYSTEM atau PROJECT. Lihat `PeranEfektif`. */
  effectiveRole: PeranEfektif;
  currentUser: User | null;
  currentUserProfile: User | null;
  projectMembers?: User[];
  masterData?: any[];
  tasks?: Task[];
  sprints?: Sprint[];
  allUsers?: User[];
  activityLogs?: any[];
  selectedTaskForDetail?: Task | null;
  expandedSprintId?: string | null;
  hasPermission: (
    role: any,
    feature: string,
    action: string,
    isOwner?: boolean,
    permissions?: any
  ) => boolean;
  updateTaskField?: (id: string, field: string, value: any) => any;
  updateTaskStatus?: (id: string, status: string) => void;
  handleQuickCreate?: (title: string, type?: string) => void | Promise<void>;
  setSelectedTaskForDetail?: (task: Task | null) => void;
  setIsTaskDetailModalOpen?: (open: boolean) => void;
  setIsNewTaskModalOpen?: (open: boolean) => void;
  deleteTask?: (id: string) => void;
  bulkDeleteTasks?: (ids: string[]) => void;
  fetchTasks?: () => Promise<void>;
  setExpandedSprintId?: (id: string | null) => void;
  setIsNewSprintModalOpen?: (open: boolean) => void;
  setIsEditSprintModalOpen?: (open: boolean) => void;
  setEditingSprint?: (sprint: Sprint | null) => void;
  handleStartSprint?: (sprintId: string) => void;
  handleCompleteSprint?: (sprintId: string) => void;
  handleDeleteSprint?: (sprintId: string) => void;
  handleDragEndPlanning?: (result: any) => void;
  fetchMasterData?: () => void;
  fetchProjects?: () => void;
  setTasks?: (tasks: Task[]) => void;
  socket?: any;
  qaInitialStatusFilter?: "ALL" | "Pending" | "Failed" | "Passed" | "Retest" | "Blocked";
  exportTasksToCSV?: () => void;
  safeFormat?: (date: any, formatStr: string) => string;
  StyledDropdown?: any;
  updateProjectRole?: (memberId: string, newRole: string) => void;
  removeProjectMember?: (memberId: string) => any;
}

/**
 * Implementasi pemilihan tampilan. Tidak diekspor — pembungkusnya di bawah
 * yang menyediakan Suspense, sehingga tidak ada jalur yang bisa merender
 * komponen lazy tanpa fallback.
 */
const TampilanTerpilih: React.FC<AppRoutesProps> = (props) => {
  const store = useAppStore();
  const projectStore = useProjectStore();

  const currentView = props.currentView ?? store.currentView;
  const setCurrentView = props.setCurrentView ?? store.setCurrentView;
  const selectedProject = props.selectedProject !== undefined ? props.selectedProject : store.selectedProject;
  const tasks = props.tasks ?? store.tasks ?? [];
  const sprints = props.sprints ?? store.sprints ?? [];
  const masterData = props.masterData ?? store.masterData ?? [];
  const activityLogs = props.activityLogs ?? store.activityLogs ?? [];
  const allUsers = props.allUsers ?? (store.allUsers as any[]) ?? [];
  const projectMembers = props.projectMembers ?? projectStore.projectMembers ?? [];
  const setTasks = props.setTasks ?? store.setTasks;

  const {
    effectiveRole,
    currentUser,
    currentUserProfile,
    hasPermission,
    updateTaskField = async (_id: string, _field: string, _value: any): Promise<any> => {},
    updateTaskStatus = (_id: string, _status: string) => {},
    handleQuickCreate = (_title: string, _type?: string) => {},
    setSelectedTaskForDetail = (_task: any) => {},
    setIsTaskDetailModalOpen = (_open: boolean) => {},
    setIsNewTaskModalOpen = (_open: boolean) => {},
    deleteTask = (_id: string) => {},
    bulkDeleteTasks = (_ids: string[]) => {},
    fetchTasks = async () => {},
    expandedSprintId = null,
    setExpandedSprintId = (_id: string | null) => {},
    setIsNewSprintModalOpen = (_open: boolean) => {},
    setIsEditSprintModalOpen = (_open: boolean) => {},
    setEditingSprint = (_sprint: Sprint | null) => {},
    handleStartSprint = (_sprintId: string) => {},
    handleCompleteSprint = (_sprintId: string) => {},
    handleDeleteSprint = (_sprintId: string) => {},
    handleDragEndPlanning = (_result: any) => {},
    socket,
    qaInitialStatusFilter,
    exportTasksToCSV = () => {},
    safeFormat = (d: any) => String(d || ""),
    fetchMasterData = () => {},
    fetchProjects = () => {},
    StyledDropdown,
    updateProjectRole,
    removeProjectMember,
  } = props;

  if (
    !selectedProject &&
    !["master", "users", "activity", "connect", "enterprise-audit"].includes(currentView)
  ) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-surface-sunken/50 p-8 text-center">
        <div className="w-16 h-16 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 mb-4 shadow-soft">
          <FolderKanban className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-medium text-content-strong mb-2">
          Pilih atau Buat Proyek Baru
        </h3>
        <p className="text-content-muted text-sm max-w-sm">
          Silakan pilih proyek dari dropdown di bagian atas atau buat proyek baru untuk mulai
          mengelola tugas.
        </p>
      </div>
    );
  }

  switch (currentView) {
    case "dashboard":
      return (
        <div className="flex-1 flex flex-col overflow-auto bg-surface-sunken min-h-screen pb-16 transition-colors duration-200">
          <DashboardView
            tasks={tasks || []}
            sprints={sprints || []}
            projectMembers={projectMembers || []}
            activityLogs={activityLogs || []}
            selectedProject={selectedProject}
            setCurrentView={setCurrentView}
            setSelectedTaskForDetail={setSelectedTaskForDetail}
            setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
            setIsNewTaskModalOpen={setIsNewTaskModalOpen}
            userRole={effectiveRole}
            currentUser={currentUser}
            fetchTasks={fetchTasks}
          />
        </div>
      );

    case "meetingNotes":
      return (
        <div className="flex-1 flex flex-col min-h-0 bg-surface-sunken">
          <MeetingNotes
            projectId={selectedProject?.id || ""}
            userRole={effectiveRole}
            currentUser={currentUserProfile || currentUser}
            projectMembers={projectMembers && projectMembers.length > 0 ? projectMembers : allUsers}
            masterData={masterData || []}
            permissions={currentUserProfile?.permissions}
          />
        </div>
      );

    case "wiki":
      return (
        <div className="flex-1 flex flex-col min-h-0 bg-surface-sunken">
          <WikiView
            projectId={selectedProject?.id || ""}
            users={allUsers}
            currentUser={currentUserProfile || currentUser}
            masterData={masterData}
          />
        </div>
      );

    case "notebooklm":
      return (
        <div className="flex-1 flex flex-col min-h-0 p-4 bg-surface-sunken">
          {hasPermission(
            effectiveRole,
            "notebooklm",
            "read",
            false,
            currentUserProfile?.permissions
          ) ? (
            <NotebookLM
              project={selectedProject}
              userRole={effectiveRole}
              currentUser={currentUserProfile}
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center bg-surface-sunken rounded-xl min-h-[500px]">
              <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
              <h2 className="text-2xl font-medium text-content-strong mb-2">403 Forbidden</h2>
              <p className="text-content-muted max-w-md text-sm">
                Anda tidak memiliki izin untuk mengakses modul NotebookLM. Silakan hubungi
                Administrator untuk memperbarui hak akses Anda.
              </p>
            </div>
          )}
        </div>
      );

    case "list":
      return (
        <IssueListView
          projectRole={
            selectedProject && currentUser?.uid
              ? selectedProject.memberRoles?.[currentUser.uid]
              : undefined
          }
          tasks={tasks || []}
          roots={(tasks || []).filter(
            (t) => !t.parentId || !(tasks || []).some((p) => p.id === t.parentId)
          )}
          sprints={sprints || []}
          projectMembers={projectMembers || []}
          allUsers={allUsers || []}
          masterData={masterData || []}
          userRole={effectiveRole}
          user={currentUser}
          currentUserProfile={currentUserProfile!}
          hasPermission={hasPermission}
          updateTaskField={updateTaskField}
          handleQuickCreate={handleQuickCreate}
          setSelectedTaskForDetail={setSelectedTaskForDetail}
          setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
          setIsNewTaskModalOpen={setIsNewTaskModalOpen}
          deleteTask={deleteTask}
          bulkDeleteTasks={bulkDeleteTasks}
          selectedProject={selectedProject}
          fetchTasks={fetchTasks}
        />
      );

    case "sprints":
      return (
        <PlanningView
          tasks={tasks || []}
          sprints={sprints || []}
          masterData={masterData || []}
          userRole={effectiveRole}
          currentUserProfile={currentUserProfile}
          projectMembers={projectMembers || []}
          expandedSprintId={expandedSprintId}
          setExpandedSprintId={setExpandedSprintId}
          setSelectedTaskForDetail={setSelectedTaskForDetail}
          setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
          setIsNewSprintModalOpen={setIsNewSprintModalOpen}
          setIsEditSprintModalOpen={setIsEditSprintModalOpen}
          setEditingSprint={setEditingSprint}
          handleStartSprint={handleStartSprint}
          handleCompleteSprint={handleCompleteSprint}
          handleDeleteSprint={handleDeleteSprint}
          handleDragEndPlanning={handleDragEndPlanning}
        />
      );

    case "board":
      return (
        <div className="flex-1 flex flex-col min-h-0 p-6 bg-surface-sunken">
          <BoardView
            tasks={tasks || []}
            masterData={masterData || []}
            projectMembers={projectMembers || []}
            setSelectedTaskForDetail={setSelectedTaskForDetail}
            setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
            userRole={effectiveRole}
            user={currentUser}
            selectedProject={selectedProject}
            refreshTasks={fetchTasks}
            setTasks={setTasks}
          />
        </div>
      );

    case "qa":
      return (
        <div className="flex-1 overflow-auto bg-surface-sunken relative custom-scrollbar p-6">
          <TestQAPanel
            tasks={tasks || []}
            projectMembers={projectMembers || []}
            selectedProject={selectedProject}
            setSelectedTaskForDetail={setSelectedTaskForDetail}
            setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
            updateTaskField={updateTaskField}
            updateTaskStatus={updateTaskStatus}
            user={currentUser}
            socket={socket}
            initialStatusFilter={qaInitialStatusFilter}
          />
        </div>
      );

    case "timeline":
      return (
        <TimelinePanel
          tasks={tasks || []}
          selectedProject={selectedProject}
          updateTaskField={updateTaskField}
          setSelectedTaskForDetail={setSelectedTaskForDetail}
          setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
        />
      );

    case "access":
    case "team":
      return (
        <TeamManagementPanel
          projectMembers={projectMembers || []}
          selectedProject={selectedProject!}
          tasks={tasks || []}
          currentUserProfile={currentUserProfile!}
          userRole={effectiveRole}
          masterData={masterData || []}
          StyledDropdown={StyledDropdown}
          updateProjectRole={updateProjectRole || (() => {})}
          removeProjectMember={removeProjectMember || (async () => {})}
          hasPermission={hasPermission}
          onRefreshProjects={fetchProjects}
        />
      );

    case "flowchart":
      return (
        <div className="flex-1 flex flex-col min-h-0 bg-surface-sunken">
          <FlowchartView
            selectedProject={selectedProject}
            tasks={tasks || []}
            projectMembers={projectMembers || []}
            setSelectedTaskForDetail={setSelectedTaskForDetail}
            setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
            currentUserProfile={currentUserProfile}
          />
        </div>
      );

    case "master":
      return (
        <MasterDataPanel
          projects={[]}
          tasks={tasks || []}
          masterData={masterData || []}
          userRole={effectiveRole}
          currentUserProfile={currentUserProfile}
          hasPermission={hasPermission}
          onRefresh={fetchMasterData}
        />
      );

    case "connect":
      return <ConnectPanel />;

    case "enterprise-audit":
    case "auditLog":
      return (
        <div className="flex-1 flex flex-col min-h-0">
          <EnterpriseAuditDashboard selectedProject={selectedProject} currentUser={currentUser} />
        </div>
      );

    case "activity":
      return (
        <ActivityLogPanel
          activityLogs={activityLogs || []}
          exportTasksToCSV={exportTasksToCSV}
          projectMembers={projectMembers || []}
          safeFormat={safeFormat}
        />
      );

    case "dbExplorer":
      return (
        <DbExplorerPanel
          selectedProject={selectedProject}
          tasks={tasks || []}
          sprints={sprints || []}
          projectMembers={projectMembers}
          activityLogs={activityLogs}
          masterData={masterData}
        />
      );

    case "settingsIntegration":
      return (() => {
        const explicitRead = currentUserProfile?.permissions?.settings?.read;
        const hasAccess =
          explicitRead !== undefined
            ? explicitRead === true
            : hasPermission(
                effectiveRole,
                "settings",
                "read",
                false,
                currentUserProfile?.permissions
              );

        if (!hasAccess) {
          return (
            <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center bg-surface-sunken min-h-[calc(100vh-theme(spacing.16))]">
              <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
              <h2 className="text-2xl font-medium text-content-strong mb-2">403 Forbidden</h2>
              <p className="text-content-muted max-w-md">
                You do not have permission to view Integration Settings. Please contact your
                administrator if you need access.
              </p>
            </div>
          );
        }

        return <SettingsPage />;
      })();

    default:
      return null;
  }
};

/**
 * Pembungkus resmi. Seluruh tampilan dimuat malas, jadi Suspense dipasang di
 * satu tempat saja alih-alih di tiap cabang `switch` — satu fallback yang
 * mustahil terlewat lebih aman daripada tujuh belas yang harus diingat.
 */
export const AppRoutes: React.FC<AppRoutesProps> = (props) => (
  <Suspense fallback={<MemuatTampilan />}>
    <TampilanTerpilih {...props} />
  </Suspense>
);
