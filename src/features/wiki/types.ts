import type { UserProfile, MasterData, UserPermissions } from "../../types";
import type { PeranEfektif } from "../../types/roles";

/** Satu baris pada tabel Documents. */
export interface DocumentModel {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  type: string;
  link: string;
  fileName: string;
  fileType: string;
  createdBy: string;
  downloadCount?: number;
  createdAt: any;
  updatedAt: any;
}

export interface WikiViewProps {
  projectId: string;
  users: UserProfile[];
  currentUser: UserProfile | null;
  userRole?: PeranEfektif;
  permissions?: Partial<UserPermissions>;
  masterData?: MasterData[];
}
