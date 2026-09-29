import i18n from "../i18n";
import { apiRequest } from "../lib/api";
import { BAKU } from "../lib/warnaLabel";
import { toast } from "sonner";

export const masterDataService = {
  restore: async () => {
    /**
     * #564 — warna cadangan diambil dari tabel baku yang sama dengan yang
     * dipakai chip di layar (`src/lib/warnaLabel.ts`), bukan daftar hex kedua.
     * Sebelum ini "In Progress" amber di sini sementara seed server dan seluruh
     * aplikasi mengenalnya ungu.
     */
    const statuses = [
      { type: "status", label: "Backlog", color: BAKU.status.backlog, order: 0, isTerminal: false },
      { type: "status", label: "To Do", color: BAKU.status.todo, order: 1, isTerminal: false },
      {
        type: "status",
        label: "In Progress",
        color: BAKU.status.inprogress,
        order: 2,
        isTerminal: false,
      },
      {
        type: "status",
        label: "Code Review",
        color: BAKU.status.codereview,
        order: 3,
        isTerminal: false,
      },
      { type: "status", label: "UAT", color: BAKU.status.uat, order: 4, isTerminal: true },
      { type: "status", label: "Done", color: BAKU.status.done, order: 5, isTerminal: true },
    ];
    const priorities = [
      {
        type: "priority",
        label: "P0 - Blocker",
        color: "#EF4444",
        icon: "ChevronsUp",
        order: 0,
      },
      {
        type: "priority",
        label: "P1 - Critical",
        color: "#F97316",
        icon: "ChevronUp",
        order: 1,
      },
      {
        type: "priority",
        label: "P2 - Major",
        color: "#EAB308",
        icon: "Equal",
        order: 2,
      },
      {
        type: "priority",
        label: "P3 - Minor",
        color: "#22C55E",
        icon: "ChevronDown",
        order: 3,
      },
    ];
    // Fallback category — area teknis murni (item #85).
    // Nilai duplikat issue_type (Bug/Enhancement/New Feature/Maintenance)
    // telah dihapus dari Master Data.
    const categories = [
      { type: "category", label: "Backend", color: "#3B82F6", order: 1 },
      { type: "category", label: "Frontend", color: "#EC4899", order: 2 },
      { type: "category", label: "DevOps", color: "#8B5CF6", order: 3 },
      { type: "category", label: "Security", color: "#DC2626", order: 4 },
      { type: "category", label: "Infrastructure", color: "#0EA5E9", order: 5 },
      { type: "category", label: "Database", color: "#F59E0B", order: 6 },
    ];

    const releases = [{ type: "release", label: "v1.0", color: "#3b82f6", order: 0 }];
    const issueTypes = [
      {
        type: "issue_type",
        label: "Task",
        color: BAKU.issue_type.task,
        icon: "CheckCircle2",
        order: 0,
      },
      {
        type: "issue_type",
        label: "Epic",
        color: BAKU.issue_type.epic,
        icon: "Zap",
        order: 1,
      },
      {
        type: "issue_type",
        label: "Bug",
        color: BAKU.issue_type.bug,
        icon: "Bug",
        order: 2,
      },
    ];
    const fitness = [
      { type: "fitur", label: "Feature A", order: 0 },
      { type: "fitur", label: "Feature B", order: 1 },
    ];
    const systems = [
      { type: "system", label: "System X", order: 0 },
      { type: "system", label: "System Y", order: 1 },
    ];
    const surroundings = [
      { type: "surrounding", label: "Environment 1", order: 0 },
      { type: "surrounding", label: "Environment 2", order: 1 },
    ];

    try {
      const allItems = [
        ...statuses,
        ...priorities,
        ...categories,
        ...releases,
        ...issueTypes,
        ...fitness,
        ...systems,
        ...surroundings,
      ];
      for (const item of allItems) {
        await apiRequest("/api/master-data", {
          method: "POST",
          body: item,
        });
      }
      toast.success(i18n.t("toast.masterRestored"));
    } catch (e) {
      console.error("Restore failed", e);
      toast.error(i18n.t("toast.masterRestoreFailed"));
    }
  },
};

/* ---------------------------------------------------------------------------
 * Diekstrak dari AppContainer. URL dan bentuk body dipertahankan apa adanya.
 * ------------------------------------------------------------------------- */

export const fetchMasterDataAll = () => apiRequest("/api/master-data");

export const updateMasterDataOrder = (itemId: string, order: number) =>
  apiRequest(`/api/master-data/${itemId}`, { method: "PUT", body: { order } });
