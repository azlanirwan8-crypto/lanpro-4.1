export interface MasterData {
  id: string;
  type: string; // Dynamic type
  label: string;
  /** Kode stabil — disimpan ke Tasks.status bila tersedia. */
  code?: string;
  color?: string;
  icon?: string;
  order: number;
  description?: string;
  fieldType?: "text" | "number" | "date" | "dropdown";
  dropdownOptions?: string[];
  roleType?: "PROJECT" | "SYSTEM";
  role_type?: "PROJECT" | "SYSTEM";
  is_system_default?: boolean;
  is_system_reserved?: boolean;
  /** #313 — status mengakhiri siklus (Done/UAT/…). */
  isTerminal?: boolean;
}
