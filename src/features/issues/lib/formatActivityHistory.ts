/**
 * #452 — History isu ala Jira: teks manusiawi, tanpa id internal berulang.
 * #456 — Field-diff before/after (status, assignee, priority, story points).
 *
 * Penulisan log baru memakai helper di bawah. Log lama (Task <id> …) dibersihkan
 * saat tampil lewat formatActivityDetailsUntukTampilan / parseActivityUntukTampilan.
 */

export type AnggotaRingkas = {
  uid?: string;
  id?: string;
  displayName?: string;
  username?: string;
  email?: string;
  nama_lengkap?: string;
};

export type FieldDiffParsed = {
  kind: "diff";
  field: string;
  label: string;
  from: string;
  to: string;
};

export type ActivityTampilan = FieldDiffParsed | { kind: "text"; text: string };

const POLA_UUID_GLOBAL = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Pola #456: "Status: Open → Done" */
const POLA_FIELD_DIFF = /^([A-Za-z][A-Za-z0-9 _-]*):\s*(.*?)\s*→\s*(.*)$/s;

const LABEL_FIELD: Record<string, string> = {
  status: "Status",
  assignee: "Assignee",
  assigneeId: "Assignee",
  priority: "Priority",
  storyPoints: "Story points",
  story_points: "Story points",
};

function namaDariAnggota(m: AnggotaRingkas | undefined | null): string | null {
  if (!m) return null;
  const nama = (m.displayName || m.nama_lengkap || m.username || m.email || "").trim();
  return nama || null;
}

export function resolveLabelAssignee(
  value: string | null | undefined,
  members: AnggotaRingkas[]
): string {
  if (value == null || String(value).trim() === "") {
    return "Unassigned";
  }
  const v = String(value).trim();
  if (v.includes("@")) {
    const byEmail = members.find((m) => (m.email || "").toLowerCase() === v.toLowerCase());
    return namaDariAnggota(byEmail) || v;
  }
  const byId = members.find((m) => m.uid === v || m.id === v);
  return namaDariAnggota(byId) || v;
}

function labelField(field: string): string {
  return LABEL_FIELD[field] || field.charAt(0).toUpperCase() + field.slice(1);
}

function nilaiKosong(v: string | number | null | undefined): string {
  if (v == null || String(v).trim() === "") return "—";
  return String(v).trim();
}

/**
 * #456 — teks diff manusiawi. Contoh: `Status: To Do → Done`
 * Mengembalikan null bila from dan to sama (tidak perlu log).
 */
export function buatDetailFieldDiff(
  field: string,
  from: string | number | null | undefined,
  to: string | number | null | undefined,
  members: AnggotaRingkas[] = []
): string | null {
  const isAssignee = field === "assignee" || field === "assigneeId";
  const dari = isAssignee
    ? resolveLabelAssignee(from == null ? null : String(from), members)
    : nilaiKosong(from);
  const ke = isAssignee
    ? resolveLabelAssignee(to == null ? null : String(to), members)
    : nilaiKosong(to);
  if (dari === ke) return null;
  return `${labelField(field)}: ${dari} → ${ke}`;
}

/** @deprecated #452 — pakai buatDetailFieldDiff; tetap untuk kompatibilitas. */
export function buatDetailStatusDiperbarui(statusBaru: string, statusLama?: string): string {
  if (statusLama != null && String(statusLama).trim() !== "") {
    return (
      buatDetailFieldDiff("status", statusLama, statusBaru) || `Status updated to ${statusBaru}`
    );
  }
  return `Status updated to ${statusBaru}`;
}

/** @deprecated #452 — pakai buatDetailFieldDiff. */
export function buatDetailAssignee(
  labelAtauId: string | null | undefined,
  members: AnggotaRingkas[],
  sebelumnya?: string | null
): string {
  if (sebelumnya !== undefined) {
    return (
      buatDetailFieldDiff("assignee", sebelumnya, labelAtauId, members) ||
      (resolveLabelAssignee(labelAtauId, members) === "Unassigned"
        ? "Unassigned"
        : `Assigned to ${resolveLabelAssignee(labelAtauId, members)}`)
    );
  }
  const label = resolveLabelAssignee(labelAtauId, members);
  if (label === "Unassigned") return "Unassigned";
  return `Assigned to ${label}`;
}

export function parseFieldDiff(details: string | null | undefined): FieldDiffParsed | null {
  const mentah = (details || "").trim();
  if (!mentah) return null;
  const m = mentah.match(POLA_FIELD_DIFF);
  if (!m) return null;
  const label = m[1].trim();
  const fieldKey =
    Object.entries(LABEL_FIELD).find(([, v]) => v.toLowerCase() === label.toLowerCase())?.[0] ||
    label.toLowerCase();
  return {
    kind: "diff",
    field: fieldKey,
    label,
    from: m[2].trim(),
    to: m[3].trim(),
  };
}

/**
 * Rapikan string log lama saat ditampilkan.
 * Contoh: "Task nH32… assigned to 4fdea5a6-…" → "Assigned to Nama".
 */
export function formatActivityDetailsUntukTampilan(
  details: string | null | undefined,
  members: AnggotaRingkas[] = []
): string {
  const parsed = parseActivityUntukTampilan(details, members);
  if (parsed.kind === "diff") {
    return `${parsed.label}: ${parsed.from} → ${parsed.to}`;
  }
  return parsed.text;
}

/** Untuk UI History: diff terstruktur atau teks biasa. */
export function parseActivityUntukTampilan(
  details: string | null | undefined,
  members: AnggotaRingkas[] = []
): ActivityTampilan {
  const mentah = (details || "").trim();
  if (!mentah) return { kind: "text", text: "" };

  const diffLangsung = parseFieldDiff(mentah);
  if (diffLangsung) {
    if (diffLangsung.field === "assignee" || diffLangsung.field === "assigneeid") {
      return {
        ...diffLangsung,
        from: resolveLabelAssignee(
          diffLangsung.from === "—" || diffLangsung.from === "Unassigned"
            ? null
            : diffLangsung.from,
          members
        ),
        to: resolveLabelAssignee(
          diffLangsung.to === "—" || diffLangsung.to === "Unassigned" ? null : diffLangsung.to,
          members
        ),
      };
    }
    return diffLangsung;
  }

  const statusMatch = mentah.match(/^Task\s+(\S+)\s+status updated to\s+(.+)$/i);
  if (statusMatch) {
    return { kind: "text", text: `Status updated to ${statusMatch[2].trim()}` };
  }

  const statusNew = mentah.match(/^Status updated to\s+(.+)$/i);
  if (statusNew) {
    return { kind: "text", text: `Status updated to ${statusNew[1].trim()}` };
  }

  const assignMatch = mentah.match(/^Task\s+(\S+)\s+assigned to\s*(.*)$/i);
  if (assignMatch) {
    const target = (assignMatch[2] || "").trim();
    if (!target) return { kind: "text", text: "Unassigned" };
    return { kind: "text", text: `Assigned to ${resolveLabelAssignee(target, members)}` };
  }

  const assignNew = mentah.match(/^Assigned to\s+(.+)$/i);
  if (assignNew) {
    return {
      kind: "text",
      text: `Assigned to ${resolveLabelAssignee(assignNew[1].trim(), members)}`,
    };
  }

  if (/^Unassigned$/i.test(mentah)) {
    return { kind: "text", text: "Unassigned" };
  }

  let keluar = mentah.replace(POLA_UUID_GLOBAL, (id) => resolveLabelAssignee(id, members));
  keluar = keluar.replace(/\bTask\s+[A-Za-z0-9_-]{16,}\b/gi, "Task");
  keluar = keluar.replace(/\sassigned to\s*$/i, " — Unassigned");
  return { kind: "text", text: keluar.replace(/\s+/g, " ").trim() };
}
