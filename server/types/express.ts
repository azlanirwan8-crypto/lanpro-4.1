import { Request } from "express";

export interface JwtUserPayload {
  id: string;
  uid?: string;
  username: string;
  email?: string;
  displayName?: string;
  nama_lengkap?: string;
  name?: string;
  role?: string;
  system_role?: string;
  projectRoles?: Record<string, string>;
  status?: string;
  department?: string | null;
  position?: string | null;
  permissions?: Record<string, any>;
  photoURL?: string | null;
  avatar_url?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtUserPayload;
  projectId?: string;
  projectRole?: string;
  io?: any;
}
