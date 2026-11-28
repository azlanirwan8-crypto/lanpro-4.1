export type IssueReference =
  | {
      kind: "meeting";
      id: string;
      title: string;
      meetingId: string;
      meetingTitle: string;
      date: string | null;
    }
  | { kind: "flowchart"; id: string; title: string; nodeId?: string; date: string | null };

export type IssueReferenceTarget = IssueReference & { projectId: string };
