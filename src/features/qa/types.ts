export interface QAComment {
  id: string;
  userName: string;
  text: string;
  timestamp: string;
}

export type QAGenerationSource = {
  id: string;
  kind: "document" | "flowchart" | "meeting" | "issue";
  label: string;
};

export type QAGenerationDraft = {
  title: string;
  kind: "positive" | "negative" | "clarify";
  preconditions: string;
  testData: string;
  steps: string[];
  expected: string;
  id?: string;
  rule?: string;
  sources: Array<QAGenerationSource & { quote?: string }>;
};

export interface QAEvidence {
  id: string;
  name: string;
  url: string;
  type: "image" | "video" | "file";
}

export interface QATestCase {
  id: string;
  suiteId: string;
  rowNum: number;
  title: string;
  preConditions?: string;
  testData?: string;
  steps: string;
  expectedResult: string;
  status: "Passed" | "Failed" | "Blocked" | "Retest" | "Pending";
  comment?: string;
  evidenceUrl?: string;
  evidenceType?: "image" | "video" | "file";
  evidenceName?: string;
  linkedBugKey?: string;
  /** #463 — id Tasks; linkedBugKey tetap untuk tampilan */
  linkedTaskId?: string | null;
  assignedTo?: string;
  priority?: "High" | "Medium" | "Low" | "Critical";
  tags?: string[];
  comments?: QAComment[];
  commentsList?: QAComment[];
  evidences?: QAEvidence[];
  history?: any[];
  activeTesterId?: string;
  generationDetails?: {
    kind: "positive" | "negative";
    preconditions: string;
    testData: string;
    rule?: string;
    sources: Array<{ id: string; kind: string; label: string; quote?: string }>;
  } | null;
}

export interface TestQAPanelProps {
  tasks: any[];
  projectMembers: any[];
  selectedProject: any;
  user: any;
  initialStatusFilter?: "ALL" | "Passed" | "Failed" | "Blocked" | "Retest" | "Pending";
  setSelectedTaskForDetail?: (task: any) => void;
  setIsTaskDetailModalOpen?: (open: boolean) => void;
  updateTaskField?: (id: string, field: string, value: any) => any;
  updateTaskStatus?: (id: string, status: string) => void;
  socket?: any;
}

export interface QATestSuite {
  id: string;
  projectId: string;
  name: string;
  phase: "SIT" | "UAT" | "PTR";
  uploadedBy: string;
  uploadedAt: string;
  fileName?: string;
  assignedTo?: string;
  cases: QATestCase[];
}
