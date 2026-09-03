import { useTranslation } from "react-i18next";
import { safeLocalStorage } from "../../lib/safeStorage";
import React, { useState, useEffect, useRef } from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  fetchSuites,
  createSuite,
  updateSuite,
  deleteSuite,
  fetchCases,
  updateCase,
  deleteCase,
  fetchCaseHistory,
  bulkUploadCases,
  updateCaseStatus,
  createCase,
  createTaskFromQA,
} from "./services/qa.service";
import { hasPermission } from "../../lib/permissions";
import { confirmDeleteAlert, showSuccessAlert } from "../../lib/sweetalert";
import { useMobileAction } from "../../contexts/MobileActionContext";
import { QAComment, QATestCase, QATestSuite, TestQAPanelProps } from "./types";
import { QATopBar } from "./components/QATopBar";
import { QASuiteSidebar } from "./components/QASuiteSidebar";
import { QATestCaseTable } from "./components/QATestCaseTable";
import { QADetailDrawer } from "./components/QADetailDrawer";
import { QAModals } from "./components/QAModals";

// Wrapper apiFetch yang dulu berada di sini kini menjadi qaFetch di
// services/qa.service.ts, bersama seluruh penyusunan URL dan header.

export function TestQAPanel({
  tasks,
  projectMembers,
  selectedProject,
  user,
  initialStatusFilter,
}: TestQAPanelProps) {
  const { t } = useTranslation();
  if (!selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-surface rounded-md border border-border-subtle shadow-soft max-w-lg mx-auto mt-12">
        <div className="p-4 bg-primary/10 text-primary rounded-full mb-4 animate-bounce">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-medium text-content-strong">
          {t("qa.pleasePickAProjectFirst")}
        </h3>
        <p className="text-sm text-content-muted mt-2 leading-relaxed">
          {t("qa.theQaTestingModuleNeeds")}
        </p>
      </div>
    );
  }

  // State Management
  const [suites, setSuites] = useState<QATestSuite[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>("");
  const [phaseFilter, setPhaseFilter] = useState<"ALL" | "SIT" | "UAT" | "PTR">("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "Passed" | "Failed" | "Blocked" | "Retest" | "Pending"
  >(initialStatusFilter || "ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [casesPage, setCasesPage] = useState(1);
  const [casesTotal, setCasesTotal] = useState(0);
  const casesPerPage = 20;
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  const [activeSuitePicDropdownId, setActiveSuitePicDropdownId] = useState<string | null>(null);
  const [activeCasePicDropdownId, setActiveCasePicDropdownId] = useState<string | null>(null);

  // Lock System States
  const [lockState, setLockState] = useState<{
    lockedBy: string | null;
    userName: string | null;
    lockedAt: number | null;
  }>({ lockedBy: null, userName: null, lockedAt: null });
  const [remainingTime, setRemainingTime] = useState<number>(900);

  // Modals & Drawers States
  const [isAddSuiteOpen, setIsAddSuiteOpen] = useState(false);
  const [newSuiteNameOnly, setNewSuiteNameOnly] = useState("");
  const [newSuitePhaseOnly, setNewSuitePhaseOnly] = useState<"SIT" | "UAT" | "PTR">("SIT");
  const [newSuiteAssignedTo, setNewSuiteAssignedTo] = useState("");

  const [isAddCaseOpen, setIsAddCaseOpen] = useState(false);
  const [activeAddTab, setActiveAddTab] = useState<"single" | "bulk">("single");
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCasePriority, setNewCasePriority] = useState<"High" | "Medium" | "Low" | "Critical">(
    "Medium"
  );
  const [newCaseAssignedTo, setNewCaseAssignedTo] = useState("");
  const [newCaseSteps, setNewCaseSteps] = useState("");
  const [newCaseExpected, setNewCaseExpected] = useState("");
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);

  const [suiteToEdit, setSuiteToEdit] = useState<QATestSuite | null>(null);
  const [suiteEditName, setSuiteEditName] = useState("");
  const [suiteEditAssignedTo, setSuiteEditAssignedTo] = useState("");

  const [caseToEditInfo, setCaseToEditInfo] = useState<QATestCase | null>(null);
  const [caseEditTitle, setCaseEditTitle] = useState("");
  const [caseEditSteps, setCaseEditSteps] = useState("");
  const [caseEditExpected, setCaseEditExpected] = useState("");
  const [caseEditPriority, setCaseEditPriority] = useState<"High" | "Medium" | "Low" | "Critical">(
    "Medium"
  );
  const [caseEditAssignedTo, setCaseEditAssignedTo] = useState("");

  const [selectedTestCase, setSelectedTestCase] = useState<QATestCase | null>(null);
  const [drawerNewComment, setDrawerNewComment] = useState("");
  const [drawerActiveTab, setDrawerActiveTab] = useState<"details" | "history">("details");
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Bug Ticket Modal States
  const [isCreateBugModalOpen, setIsCreateBugModalOpen] = useState(false);
  const [bugModalTestCase, setBugModalTestCase] = useState<QATestCase | null>(null);
  const [bugTitleInput, setBugTitleInput] = useState("");
  const [bugSelectedParentId, setBugSelectedParentId] = useState("");
  const [parentSearchTerm, setParentSearchTerm] = useState("");
  const [bugPriorityInput, setBugPriorityInput] = useState("High");
  const [bugAssigneeInput, setBugAssigneeInput] = useState("");
  const [bugDescriptionInput, setBugDescriptionInput] = useState("");
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);

  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const currentUserUid = user?.uid || user?.id || "anonymous-user";
  const currentUserName = user?.displayName || user?.name || user?.username || "QA Tester";
  const currentUserRole = (user?.role ? user.role.toLowerCase() : "qa") as any;

  // RBAC Permission Flags
  const isAdminRole =
    currentUserRole === "admin" ||
    currentUserRole === "administrator" ||
    currentUserRole === "superadmin" ||
    currentUserRole === "manager" ||
    currentUserRole === "head" ||
    currentUserRole === "project_admin" ||
    currentUserRole === "lead";

  const canCreate =
    isAdminRole || hasPermission(currentUserRole, "qaTesting", "create", false, user?.permissions);
  const canUpdate =
    isAdminRole || hasPermission(currentUserRole, "qaTesting", "update", false, user?.permissions);
  const canDelete =
    isAdminRole || hasPermission(currentUserRole, "qaTesting", "delete", false, user?.permissions);

  const { registerAction, unregisterAction } = useMobileAction();

  useEffect(() => {
    if (canCreate) {
      registerAction({
        id: "qa-add-testcase",
        label: t("qa.addNewTestCase") || "Buat Test Case Baru",
        onClick: () => setIsAddCaseOpen(true),
        canCreate: canCreate,
      });
    } else {
      unregisterAction("qa-add-testcase");
    }
    return () => unregisterAction("qa-add-testcase");
  }, [canCreate, registerAction, unregisterAction, t]);

  // Load suites (tanpa seluruh cases) + cases halaman aktif suite (#318)
  const loadSuitesFromBackend = async () => {
    try {
      const suitesRes = await fetchSuites(selectedProject.id);
      if (suitesRes.ok) {
        const suitesData = await suitesRes.json();
        if (suitesData.status === "success") {
          const mergedSuites: QATestSuite[] = (suitesData.data || []).map((suite: any) => ({
            ...suite,
            cases: suite.cases || [],
          }));
          setSuites(mergedSuites);
          if (mergedSuites.length > 0 && !selectedSuiteId) {
            setSelectedSuiteId(mergedSuites[0].id);
          }
        }
      }
    } catch (e) {
      console.warn("Falling back to local suites state:", e);
    }
  };

  const mapCaseRow = (tc: any): QATestCase => ({
    ...tc,
    status: tc.status && tc.status !== "untested" ? tc.status : "Pending",
    expectedResult: tc.expected || tc.expectedResult || "",
    title: tc.judul || tc.title || "",
    steps: typeof tc.steps === "string" ? JSON.parse(tc.steps) : tc.steps || [],
    priority: tc.prioritas || tc.priority || "Medium",
    assignedTo: tc.assignedTo || undefined,
    commentsList:
      typeof tc.commentsList === "string" ? JSON.parse(tc.commentsList) : tc.commentsList || [],
    evidences: typeof tc.evidences === "string" ? JSON.parse(tc.evidences) : tc.evidences || [],
  });

  const loadCasesForActiveSuite = async (suiteId: string) => {
    if (!selectedProject?.id || !suiteId) return;
    try {
      const casesRes = await fetchCases(selectedProject.id, {
        page: casesPage,
        limit: casesPerPage,
        search: searchTerm,
        suiteId,
      });
      if (!casesRes.ok) return;
      const casesData = await casesRes.json();
      if (casesData.status !== "success") return;
      const dbCases = (casesData.data || []).map(mapCaseRow);
      setCasesTotal(casesData.meta?.total ?? dbCases.length);
      setSuites((prev) => prev.map((s) => (s.id === suiteId ? { ...s, cases: dbCases } : s)));
    } catch (e) {
      console.warn("Failed to load QA cases page:", e);
    }
  };

  useEffect(() => {
    if (selectedProject?.id) {
      loadSuitesFromBackend();
    }
  }, [selectedProject?.id]);

  useEffect(() => {
    setCasesPage(1);
  }, [selectedSuiteId, searchTerm, statusFilter]);

  useEffect(() => {
    if (selectedSuiteId) {
      void loadCasesForActiveSuite(selectedSuiteId);
    }
  }, [selectedProject?.id, selectedSuiteId, casesPage, searchTerm]);

  // Save state helper
  const saveSuitesToStorage = (updatedSuites: QATestSuite[]) => {
    setSuites(updatedSuites);
    safeLocalStorage.setItem(
      `lanpro_qa_suites_${selectedProject.id}`,
      JSON.stringify(updatedSuites)
    );
  };

  // Lock helper
  const acquireLockForCurrentUser = () => {
    const lockKey = `lanpro_qa_lock_${selectedSuiteId}`;
    const newLock = { lockedBy: currentUserUid, userName: currentUserName, lockedAt: Date.now() };
    safeLocalStorage.setItem(lockKey, JSON.stringify(newLock));
    setLockState(newLock);
    setRemainingTime(900);
  };

  const handleForceUnlock = () => {
    acquireLockForCurrentUser();
    toast.success(t("toast.forceUnlockOk"));
  };

  const releaseLockManually = () => {
    const lockKey = `lanpro_qa_lock_${selectedSuiteId}`;
    safeLocalStorage.removeItem(lockKey);
    setLockState({ lockedBy: null, userName: null, lockedAt: null });
    toast.info(t("toast.lockReleased"));
  };

  // Status Change Handler
  const handleStatusChange = async (
    caseId: string,
    newStatus: "Passed" | "Failed" | "Blocked" | "Retest" | "Pending"
  ) => {
    const updatedSuites = suites.map((suite) => ({
      ...suite,
      cases: suite.cases.map((c) => (c.id === caseId ? { ...c, status: newStatus } : c)),
    }));
    saveSuitesToStorage(updatedSuites);

    try {
      await updateCaseStatus(selectedProject.id, caseId, { status: newStatus });
      toast.success(t("toast.qaStatusChanged", { status: newStatus }));
    } catch (e: any) {
      console.warn("Status update fallback:", e.message);
    }
  };

  // Update Suite / Case PIC Handlers
  const handleUpdateSuitePic = async (suiteId: string, assignedTo: string) => {
    setActiveSuitePicDropdownId(null);
    const updatedSuites = suites.map((s) =>
      s.id === suiteId ? { ...s, assignedTo: assignedTo || undefined } : s
    );
    saveSuitesToStorage(updatedSuites);
    const targetSuite = updatedSuites.find((s) => s.id === suiteId);
    if (targetSuite) {
      toast.success(t("toast.picModuleUpdated"));
      try {
        await updateSuite(selectedProject.id, suiteId, targetSuite);
      } catch (err) {
        console.warn("Failed to update suite PIC:", err);
      }
    }
  };

  const handleUpdateCasePic = async (suiteId: string, caseId: string, assignedTo: string) => {
    setActiveCasePicDropdownId(null);
    const updatedSuites = suites.map((s) => {
      if (s.id !== suiteId) return s;
      return {
        ...s,
        cases: s.cases.map((c) =>
          c.id === caseId ? { ...c, assignedTo: assignedTo || undefined } : c
        ),
      };
    });
    saveSuitesToStorage(updatedSuites);
    const targetSuite = updatedSuites.find((s) => s.id === suiteId);
    const targetCase = targetSuite?.cases.find((c) => c.id === caseId);
    if (targetCase) {
      toast.success(t("toast.picTaskUpdated"));
      try {
        await updateCase(selectedProject.id, caseId, targetCase);
      } catch (err) {
        console.warn("Failed to update test case PIC:", err);
      }
    }
  };

  // ADMIN BULK OPERATIONS
  const handleToggleSelectAll = (cases: QATestCase[]) => {
    if (selectedCaseIds.length === cases.length) {
      setSelectedCaseIds([]);
    } else {
      setSelectedCaseIds(cases.map((c) => c.id));
    }
  };

  const handleToggleSelectCase = (caseId: string) => {
    if (selectedCaseIds.includes(caseId)) {
      setSelectedCaseIds(selectedCaseIds.filter((id) => id !== caseId));
    } else {
      setSelectedCaseIds([...selectedCaseIds, caseId]);
    }
  };

  const handleBulkAssignPic = async (assignedTo: string) => {
    if (selectedCaseIds.length === 0) return;
    const updatedSuites = suites.map((suite) => ({
      ...suite,
      cases: suite.cases.map((c) =>
        selectedCaseIds.includes(c.id) ? { ...c, assignedTo: assignedTo || undefined } : c
      ),
    }));
    saveSuitesToStorage(updatedSuites);
    toast.success(t("toast.picBulkAssigned", { count: selectedCaseIds.length }));
    setSelectedCaseIds([]);
  };

  const handleBulkChangeStatus = async (
    newStatus: "Passed" | "Failed" | "Blocked" | "Retest" | "Pending"
  ) => {
    if (selectedCaseIds.length === 0) return;
    const updatedSuites = suites.map((suite) => ({
      ...suite,
      cases: suite.cases.map((c) =>
        selectedCaseIds.includes(c.id) ? { ...c, status: newStatus } : c
      ),
    }));
    saveSuitesToStorage(updatedSuites);
    toast.success(t("toast.qaStatusBulk", { count: selectedCaseIds.length, status: newStatus }));
    setSelectedCaseIds([]);
  };

  const handleBulkDeleteCases = async () => {
    if (selectedCaseIds.length === 0) return;
    const isConfirmed = await confirmDeleteAlert(
      t("alerts.confirmTitle"),
      `${selectedCaseIds.length} test case terpilih akan dihapus secara permanen dan tidak dapat dikembalikan!`
    );
    if (!isConfirmed) return;

    const updatedSuites = suites.map((suite) => ({
      ...suite,
      cases: suite.cases.filter((c) => !selectedCaseIds.includes(c.id)),
    }));
    saveSuitesToStorage(updatedSuites);
    setSelectedCaseIds([]);
    showSuccessAlert("Berhasil!", `${selectedCaseIds.length} test case berhasil dihapus.`);
  };

  // Add Suite Handler
  const handleAddSuiteOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuiteNameOnly.trim()) return;

    const newSuite: QATestSuite = {
      id: `suite-${Date.now()}`,
      projectId: selectedProject.id,
      name: newSuiteNameOnly.trim(),
      phase: newSuitePhaseOnly,
      uploadedBy: currentUserUid,
      uploadedAt: new Date().toISOString(),
      assignedTo: newSuiteAssignedTo || undefined,
      cases: [],
    };

    const updatedSuites = [...suites, newSuite];
    saveSuitesToStorage(updatedSuites);
    setSelectedSuiteId(newSuite.id);
    setIsAddSuiteOpen(false);
    setNewSuiteNameOnly("");

    try {
      await createSuite(selectedProject.id, newSuite);
      toast.success(t("toast.scriptDocAdded"));
    } catch (err) {
      console.warn("Failed to add suite:", err);
    }
  };

  // Add Manual Case Handler
  const handleCreateManualTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseTitle || !newCaseSteps || !newCaseExpected || !selectedSuiteId) return;

    const targetSuite = suites.find((s) => s.id === selectedSuiteId);
    const nextRowNum = targetSuite ? targetSuite.cases.length + 1 : 1;

    const newTestCase: QATestCase = {
      id: `case-${Date.now()}`,
      suiteId: selectedSuiteId,
      rowNum: nextRowNum,
      title: newCaseTitle,
      steps: newCaseSteps,
      expectedResult: newCaseExpected,
      status: "Pending",
      priority: newCasePriority,
      assignedTo: newCaseAssignedTo || undefined,
      commentsList: [],
      evidences: [],
    };

    const updatedSuites = suites.map((suite) =>
      suite.id === selectedSuiteId ? { ...suite, cases: [...suite.cases, newTestCase] } : suite
    );
    saveSuitesToStorage(updatedSuites);

    try {
      await createCase(selectedProject.id, newTestCase);
    } catch (err) {
      console.warn("Failed to post case:", err);
    }

    setNewCaseTitle("");
    setNewCaseSteps("");
    setNewCaseExpected("");
    setIsAddCaseOpen(false);
    toast.success(t("toast.testCaseAdded"));
  };

  // Bulk Upload Handler
  const handleBulkUploadTestCases = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkUploadFile || !selectedSuiteId) return;

    const formData = new FormData();
    formData.append("file", bulkUploadFile);
    formData.append("suiteId", selectedSuiteId);
    formData.append("projectId", selectedProject.id);
    formData.append("uploaderName", currentUserName);
    formData.append("phase", phaseFilter === "ALL" ? "SIT" : phaseFilter);

    try {
      const response = await bulkUploadCases(formData);
      if (response.ok) {
        toast.success(t("toast.bulkUploadOk"));
        setIsAddCaseOpen(false);
        loadSuitesFromBackend();
      }
    } catch (err) {
      toast.error(t("toast.bulkUploadFailed"));
    }
  };

  // Edit Suite Handler
  const submitEditSuite = async () => {
    if (!suiteToEdit) return;
    const updatedSuite = {
      ...suiteToEdit,
      name: suiteEditName.trim() || suiteToEdit.name,
      assignedTo: suiteEditAssignedTo || undefined,
    };
    const updatedSuites = suites.map((s) => (s.id === suiteToEdit.id ? updatedSuite : s));
    saveSuitesToStorage(updatedSuites);

    try {
      await updateSuite(selectedProject.id, suiteToEdit.id, updatedSuite);
      toast.success(t("toast.suiteUpdated"));
    } catch (err) {
      console.warn("Failed to update suite:", err);
    }
    setSuiteToEdit(null);
  };

  // Edit Case Handler
  const submitEditTestCaseInfo = async () => {
    if (!caseToEditInfo) return;
    const updatedTc = {
      ...caseToEditInfo,
      title: caseEditTitle.trim() || caseToEditInfo.title,
      steps: caseEditSteps.trim() || caseToEditInfo.steps,
      expectedResult: caseEditExpected.trim() || caseToEditInfo.expectedResult,
      priority: caseEditPriority,
      assignedTo: caseEditAssignedTo || undefined,
    };

    const updatedSuites = suites.map((suite) => ({
      ...suite,
      cases: suite.cases.map((c) => (c.id === caseToEditInfo.id ? updatedTc : c)),
    }));
    saveSuitesToStorage(updatedSuites);

    try {
      await updateCase(selectedProject.id, caseToEditInfo.id, updatedTc);
      toast.success(t("toast.testCaseUpdated"));
    } catch (err) {
      console.warn("Failed to update case:", err);
    }
    setCaseToEditInfo(null);
  };

  // Delete Handlers
  const handleDeleteSuite = async (suite: QATestSuite) => {
    const isConfirmed = await confirmDeleteAlert(
      t("alerts.confirmTitle"),
      t("alerts.deleteSuiteText", { name: suite.name })
    );
    if (!isConfirmed) return;

    const updated = suites.filter((s) => s.id !== suite.id);
    saveSuitesToStorage(updated);
    if (selectedSuiteId === suite.id) setSelectedSuiteId(updated[0]?.id || "");

    try {
      await deleteSuite(selectedProject.id, suite.id);
      showSuccessAlert(t("alerts.successTitle"), t("alerts.suiteDeleted"));
    } catch (e: any) {
      toast.error(e?.message || "Gagal menghapus test suite.");
    }
  };

  const handleDeleteTestCase = async (tc: QATestCase) => {
    const isConfirmed = await confirmDeleteAlert(
      t("alerts.confirmTitle"),
      t("alerts.deleteCaseText", { title: tc.title })
    );
    if (!isConfirmed) return;

    const updatedSuites = suites.map((suite) => ({
      ...suite,
      cases: suite.cases.filter((c) => c.id !== tc.id),
    }));
    saveSuitesToStorage(updatedSuites);

    try {
      await deleteCase(selectedProject.id, tc.id);
      showSuccessAlert(t("alerts.successTitle"), t("alerts.caseDeleted"));
    } catch (e: any) {
      toast.error(e?.message || "Gagal menghapus test case.");
    }
  };

  // Bug Ticket Creation Handler
  const handleOpenCreateBugModal = (tc: QATestCase) => {
    setBugModalTestCase(tc);
    setBugTitleInput(`BUG: ${tc.title}`);
    setBugDescriptionInput(
      `### Detail Bug\nOrigin: TC #${tc.rowNum}\nSteps:\n${tc.steps}\nExpected:\n${tc.expectedResult}`
    );
    setBugPriorityInput(tc.priority || "High");
    setIsCreateBugModalOpen(true);
  };

  const handleSubmitCreateBugTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugModalTestCase || !bugSelectedParentId) return;

    setIsSubmittingBug(true);
    try {
      const response = await createTaskFromQA(selectedProject.id, {
        title: bugTitleInput.trim(),
        description: bugDescriptionInput,
        status: "todo",
        type: "bug",
        priority: bugPriorityInput.toLowerCase(),
        parentId: bugSelectedParentId,
        assigneeId: bugAssigneeInput || null,
      });

      if (response && response.status === "success") {
        const createdKey = response.data.key || `BUG-${Date.now()}`;
        const updatedSuites = suites.map((s) => ({
          ...s,
          cases: s.cases.map((c) =>
            c.id === bugModalTestCase.id ? { ...c, linkedBugKey: createdKey } : c
          ),
        }));
        saveSuitesToStorage(updatedSuites);
        toast.success(t("toast.bugTicketCreated", { kunci: createdKey }));
        setIsCreateBugModalOpen(false);
      }
    } catch (err: any) {
      toast.error(t("toast.bugTicketFailed"));
    } finally {
      setIsSubmittingBug(false);
    }
  };

  // Drawer comment send
  const handleSendCommentFromDrawer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTestCase || !drawerNewComment.trim()) return;

    const newComment: QAComment = {
      id: `comment-${Date.now()}`,
      userName: currentUserName,
      text: drawerNewComment.trim(),
      timestamp: new Date().toISOString(),
    };

    const list = [...(selectedTestCase.commentsList || []), newComment];
    const updatedCase = { ...selectedTestCase, commentsList: list };
    setSelectedTestCase(updatedCase);

    const updatedSuites = suites.map((s) => ({
      ...s,
      cases: s.cases.map((c) => (c.id === selectedTestCase.id ? updatedCase : c)),
    }));
    saveSuitesToStorage(updatedSuites);
    setDrawerNewComment("");
    toast.success(t("toast.commentAdded"));
  };

  const handleEvidenceUploadFromDrawer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedTestCase) return;

    const fileUrl = URL.createObjectURL(files[0]);
    const newEv = {
      id: `ev-${Date.now()}`,
      name: files[0].name,
      url: fileUrl,
      type: files[0].name.match(/\.(mp4|mov|avi)$/i) ? "video" : ("image" as any),
    };
    const updatedEvs = [...(selectedTestCase.evidences || []), newEv];
    const updatedCase = { ...selectedTestCase, evidences: updatedEvs };

    setSelectedTestCase(updatedCase);
    const updatedSuites = suites.map((s) => ({
      ...s,
      cases: s.cases.map((c) => (c.id === selectedTestCase.id ? updatedCase : c)),
    }));
    saveSuitesToStorage(updatedSuites);
    toast.success(t("toast.evidenceUploaded"));
  };

  const handleRemoveSpecificEvidenceFromDrawer = (evidenceId: string) => {
    if (!selectedTestCase) return;
    const updatedEvs = (selectedTestCase.evidences || []).filter((e) => e.id !== evidenceId);
    const updatedCase = { ...selectedTestCase, evidences: updatedEvs };
    setSelectedTestCase(updatedCase);

    const updatedSuites = suites.map((s) => ({
      ...s,
      cases: s.cases.map((c) => (c.id === selectedTestCase.id ? updatedCase : c)),
    }));
    saveSuitesToStorage(updatedSuites);
    toast.info(t("toast.evidenceDeleted"));
  };

  const fetchExecutionHistory = async (caseId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetchCaseHistory(selectedProject.id, caseId);
      if (res.ok) {
        const data = await res.json();
        setExecutionLogs(data.data || []);
      }
    } catch (e) {
      setExecutionLogs([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleExportQAReport = () => {
    const activeSuite = suites.find((s) => s.id === selectedSuiteId);
    if (!activeSuite) return;
    const reportContent = `QA REPORT: ${activeSuite.name}\nTotal: ${activeSuite.cases.length}`;
    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QA_Report_${activeSuite.name}.txt`;
    a.click();
    toast.success(t("toast.reportExported"));
  };

  const handleMigrateSuitePhase = async () => {
    const activeSuite = suites.find((s) => s.id === selectedSuiteId);
    if (!activeSuite) return;
    const nextPhase = activeSuite.phase === "SIT" ? "UAT" : "PTR";
    const newSuite: QATestSuite = {
      ...activeSuite,
      id: `suite-${Date.now()}`,
      phase: nextPhase,
      name: activeSuite.name.replace(/\s*\((SIT|UAT|PTR)\)/gi, ""),
      cases: activeSuite.cases.map((c) => ({ ...c, status: "Pending" })),
    };
    saveSuitesToStorage([newSuite, ...suites]);
    setSelectedSuiteId(newSuite.id);
    toast.success(t("toast.moduleMigrated", { fase: nextPhase }));
  };

  const handleGenerateWithAi = () => {
    toast.info(t("toast.aiGeneratorSimulated"));
  };

  const activeSuiteObj = suites.find((s) => s.id === selectedSuiteId);
  const suitesForFilter = suites.filter((s) => phaseFilter === "ALL" || s.phase === phaseFilter);
  const filteredCases =
    activeSuiteObj?.cases.filter((c) => statusFilter === "ALL" || c.status === statusFilter) || [];

  return (
    <div className="w-full space-y-3.5 select-none" id="qa_module_container">
      {/* Topbar Lock Indicator & Integrated Velzon Page Title */}
      <QATopBar
        lockState={lockState}
        remainingTime={remainingTime}
        currentUserUid={currentUserUid}
        currentUserRole={currentUserRole}
        handleForceUnlock={handleForceUnlock}
        releaseLockManually={releaseLockManually}
      />

      {/* OPTIMIZED RESPONSIVE GRID (3 : 9 RATIO) - 75% WIDTH FOR TABLE */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
        <QASuiteSidebar
          suitesForFilter={suitesForFilter}
          selectedSuiteId={selectedSuiteId}
          setSelectedSuiteId={setSelectedSuiteId}
          phaseFilter={phaseFilter}
          setPhaseFilter={setPhaseFilter}
          setIsAddSuiteOpen={setIsAddSuiteOpen}
          setSuiteToEdit={setSuiteToEdit}
          setSuiteEditName={setSuiteEditName}
          setSuiteEditAssignedTo={setSuiteEditAssignedTo}
          handleDeleteSuite={handleDeleteSuite}
          activeSuitePicDropdownId={activeSuitePicDropdownId}
          setActiveSuitePicDropdownId={setActiveSuitePicDropdownId}
          handleUpdateSuitePic={handleUpdateSuitePic}
          projectMembers={projectMembers}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />

        <QATestCaseTable
          activeSuite={activeSuiteObj}
          filteredCases={filteredCases}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          projectMembers={projectMembers}
          currentUserUid={currentUserUid}
          currentUserRole={currentUserRole}
          lockState={lockState}
          isGeneratingAi={isGeneratingAi}
          handleGenerateWithAi={handleGenerateWithAi}
          handleExportQAReport={handleExportQAReport}
          handleMigrateSuitePhase={handleMigrateSuitePhase}
          setIsAddCaseOpen={setIsAddCaseOpen}
          setActiveAddTab={setActiveAddTab}
          handleStatusChange={handleStatusChange}
          activeCasePicDropdownId={activeCasePicDropdownId}
          setActiveCasePicDropdownId={setActiveCasePicDropdownId}
          handleUpdateCasePic={handleUpdateCasePic}
          setCaseToEditInfo={setCaseToEditInfo}
          setCaseEditTitle={setCaseEditTitle}
          setCaseEditSteps={setCaseEditSteps}
          setCaseEditExpected={setCaseEditExpected}
          setCaseEditPriority={setCaseEditPriority}
          setCaseEditAssignedTo={setCaseEditAssignedTo}
          handleDeleteTestCase={handleDeleteTestCase}
          handleOpenCreateBugModal={handleOpenCreateBugModal}
          setSelectedTestCase={setSelectedTestCase}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          isAdminRole={isAdminRole}
          selectedCaseIds={selectedCaseIds}
          handleToggleSelectAll={handleToggleSelectAll}
          handleToggleSelectCase={handleToggleSelectCase}
          handleBulkAssignPic={handleBulkAssignPic}
          handleBulkChangeStatus={handleBulkChangeStatus}
          handleBulkDeleteCases={handleBulkDeleteCases}
          casesPage={casesPage}
          setCasesPage={setCasesPage}
          casesTotal={casesTotal}
          casesPerPage={casesPerPage}
        />
      </div>

      {/* Side Drawer Detail */}
      <QADetailDrawer
        selectedTestCase={selectedTestCase}
        setSelectedTestCase={setSelectedTestCase}
        drawerActiveTab={drawerActiveTab}
        setDrawerActiveTab={setDrawerActiveTab}
        executionLogs={executionLogs}
        loadingHistory={loadingHistory}
        fetchExecutionHistory={fetchExecutionHistory}
        drawerNewComment={drawerNewComment}
        setDrawerNewComment={setDrawerNewComment}
        handleSendCommentFromDrawer={handleSendCommentFromDrawer}
        handleEvidenceUploadFromDrawer={handleEvidenceUploadFromDrawer}
        handleRemoveSpecificEvidenceFromDrawer={handleRemoveSpecificEvidenceFromDrawer}
        handleOpenCreateBugModal={handleOpenCreateBugModal}
        handleStatusChange={handleStatusChange}
        projectMembers={projectMembers}
      />

      {/* Dialog Modals */}
      <QAModals
        isAddSuiteOpen={isAddSuiteOpen}
        setIsAddSuiteOpen={setIsAddSuiteOpen}
        newSuiteNameOnly={newSuiteNameOnly}
        setNewSuiteNameOnly={setNewSuiteNameOnly}
        newSuitePhaseOnly={newSuitePhaseOnly}
        setNewSuitePhaseOnly={setNewSuitePhaseOnly}
        newSuiteAssignedTo={newSuiteAssignedTo}
        setNewSuiteAssignedTo={setNewSuiteAssignedTo}
        handleAddSuiteOnly={handleAddSuiteOnly}
        isAddCaseOpen={isAddCaseOpen}
        setIsAddCaseOpen={setIsAddCaseOpen}
        activeAddTab={activeAddTab}
        setActiveAddTab={setActiveAddTab}
        newCaseTitle={newCaseTitle}
        setNewCaseTitle={setNewCaseTitle}
        newCasePriority={newCasePriority}
        setNewCasePriority={setNewCasePriority}
        newCaseAssignedTo={newCaseAssignedTo}
        setNewCaseAssignedTo={setNewCaseAssignedTo}
        newCaseSteps={newCaseSteps}
        setNewCaseSteps={setNewCaseSteps}
        newCaseExpected={newCaseExpected}
        setNewCaseExpected={setNewCaseExpected}
        handleCreateManualTestCase={handleCreateManualTestCase}
        bulkUploadFile={bulkUploadFile}
        setBulkUploadFile={setBulkUploadFile}
        handleBulkUploadTestCases={handleBulkUploadTestCases}
        suiteToEdit={suiteToEdit}
        setSuiteToEdit={setSuiteToEdit}
        suiteEditName={suiteEditName}
        setSuiteEditName={setSuiteEditName}
        suiteEditAssignedTo={suiteEditAssignedTo}
        setSuiteEditAssignedTo={setSuiteEditAssignedTo}
        submitEditSuite={submitEditSuite}
        caseToEditInfo={caseToEditInfo}
        setCaseToEditInfo={setCaseToEditInfo}
        caseEditTitle={caseEditTitle}
        setCaseEditTitle={setCaseEditTitle}
        caseEditSteps={caseEditSteps}
        setCaseEditSteps={setCaseEditSteps}
        caseEditExpected={caseEditExpected}
        setCaseEditExpected={setCaseEditExpected}
        caseEditPriority={caseEditPriority}
        setCaseEditPriority={setCaseEditPriority}
        caseEditAssignedTo={caseEditAssignedTo}
        setCaseEditAssignedTo={setCaseEditAssignedTo}
        submitEditTestCaseInfo={submitEditTestCaseInfo}
        isCreateBugModalOpen={isCreateBugModalOpen}
        setIsCreateBugModalOpen={setIsCreateBugModalOpen}
        bugModalTestCase={bugModalTestCase}
        setBugModalTestCase={setBugModalTestCase}
        bugTitleInput={bugTitleInput}
        setBugTitleInput={setBugTitleInput}
        bugSelectedParentId={bugSelectedParentId}
        setBugSelectedParentId={setBugSelectedParentId}
        parentSearchTerm={parentSearchTerm}
        setParentSearchTerm={setParentSearchTerm}
        bugPriorityInput={bugPriorityInput}
        setBugPriorityInput={setBugPriorityInput}
        bugAssigneeInput={bugAssigneeInput}
        setBugAssigneeInput={setBugAssigneeInput}
        bugDescriptionInput={bugDescriptionInput}
        setBugDescriptionInput={setBugDescriptionInput}
        isSubmittingBug={isSubmittingBug}
        handleSubmitCreateBugTicket={handleSubmitCreateBugTicket}
        selectedSuiteId={selectedSuiteId}
        suites={suites}
        tasks={tasks}
        projectMembers={projectMembers}
        selectedProject={selectedProject}
      />
    </div>
  );
}
