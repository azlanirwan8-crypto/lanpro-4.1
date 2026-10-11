/**
 * #689 butir (f) — penyusun baris dan sumbu Roadmap.
 *
 * Test yang paling penting di sini adalah yang PERTAMA: keluaran algoritma
 * ber-indeks harus SAMA dengan algoritma pemindaian ulang yang shipped. Kalau
 * tidak, "perbaikan performa" ini diam-diam mengubah bentuk papan yang dilihat
 * pengguna — dan tidak ada satu pun test lain yang menangkap itu.
 *
 * Untuk itu `referensiLama` di bawah ini adalah terjemahan langsung dari
 * `TimelinePanel.tsx:212-267` seperti adanya, bukan karangan.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { susunBaris, indeksAnak, sumbuWaktu, type BarisHirarki } from "./hirarkiBaris";
import type { Task } from "../../../types";

const tugas = (id: string, tambahan: Partial<Task> = {}): Task =>
  ({
    id,
    projectId: "p1",
    key: `LAN-${id}`,
    title: `Judul ${id}`,
    type: "task",
    status: "todo",
    priority: "Medium",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...tambahan,
  }) as Task;

/** Algoritma lama: filter per induk + `some` per akar. Dipakai sebagai oracle. */
const referensiLama = (tasks: Task[], expandedEpics: Record<string, boolean>): BarisHirarki[] => {
  const list: BarisHirarki[] = [];
  const topLevels = tasks.filter((t) => !t.parentId || !tasks.some((p) => p.id === t.parentId));
  const sorted = [...topLevels].sort((a, b) => {
    const aEpic = (a.type || "").toLowerCase() === "epic";
    const bEpic = (b.type || "").toLowerCase() === "epic";
    if (aEpic && !bEpic) return -1;
    if (!aEpic && bEpic) return 1;
    return 0;
  });

  sorted.forEach((task) => {
    list.push({ task, isChild: false, depth: 0, isLastChild: false });
    const children = tasks.filter((t) => t.parentId === task.id);
    if (children.length > 0) {
      if (expandedEpics[task.id] !== false) {
        const addChildren = (currentChildren: Task[], depth: number) => {
          currentChildren.forEach((child, idx) => {
            list.push({
              task: child,
              isChild: true,
              depth,
              parentId: child.parentId,
              isLastChild: idx === currentChildren.length - 1,
            });
            const grand = tasks.filter((t) => t.parentId === child.id);
            if (grand.length > 0 && expandedEpics[child.id] !== false) {
              addChildren(grand, depth + 1);
            }
          });
        };
        addChildren(children, 1);
      }
    }
  });

  return list;
};

const SUSUNAN = [
  tugas("epic-1", { type: "epic" }),
  tugas("epic-2", { type: "epic" }),
  tugas("a-1", { parentId: "epic-1" }),
  tugas("a-2", { parentId: "epic-1" }),
  tugas("cucu", { parentId: "a-1" }),
  tugas("yatim", { parentId: "tidak-ada" }),
  tugas("bebas"),
];

const bentuk = (baris: BarisHirarki[]) =>
  baris.map((b) => `${b.task.id}@${b.depth}${b.isChild ? "" : "*"}`);

describe("#689 susunBaris harus sama dengan algoritma lama", () => {
  it("susunan penuh identik byte demi byte dengan referensi", () => {
    expect(bentuk(susunBaris(SUSUNAN, {}))).toEqual(bentuk(referensiLama(SUSUNAN, {})));
  });

  it("epic yang dilipat menghasilkan susunan yang sama juga", () => {
    const dilipat = { "epic-1": false } as Record<string, boolean>;
    expect(bentuk(susunBaris(SUSUNAN, dilipat))).toEqual(bentuk(referensiLama(SUSUNAN, dilipat)));
  });

  it("anak tengah yang dilipat menyembunyikan cucunya saja", () => {
    const dilipat = { "a-1": false } as Record<string, boolean>;
    const hasil = bentuk(susunBaris(SUSUNAN, dilipat));
    expect(hasil).toEqual(bentuk(referensiLama(SUSUNAN, dilipat)));
    expect(hasil).toContain("a-1@1");
    expect(hasil.some((b) => b.startsWith("cucu@"))).toBe(false);
  });

  it("epic didahulukan, task yatim tetap masuk sebagai akar", () => {
    const hasil = bentuk(susunBaris(SUSUNAN, {}));
    expect(hasil[0].startsWith("epic-1")).toBe(true);
    expect(hasil.map((b) => b.split("@")[0])).toContain("yatim");
    expect(hasil.map((b) => b.split("@")[0])).toContain("bebas");
  });

  it("tanpa tugas sama sekali: array kosong, bukan melempar", () => {
    expect(susunBaris([], {})).toEqual([]);
  });
});

describe("#689 indeksAnak", () => {
  it("mengelompokkan per induk dan mengabaikan task tanpa induk", () => {
    const indeks = indeksAnak(SUSUNAN);
    expect(indeks.get("epic-1")?.map((t) => t.id)).toEqual(["a-1", "a-2"]);
    expect(indeks.has("bebas")).toBe(false);
    // Index tidak perlu tahu induknya ada: `yatim` (parentId "tidak-ada") tetap
    // dapat wadahnya. Yang mengubah yatim menjadi AKAR adalah `susunBaris`,
    // dan itu diuji di atas.
    expect(indeks.get("tidak-ada")?.map((t) => t.id)).toEqual(["yatim"]);
  });

  it("dipakai untuk menanyakan 'punya anak' tanpa memindai ulang", () => {
    const indeks = indeksAnak(SUSUNAN);
    expect(indeks.has("a-1")).toBe(true);
    expect(indeks.has("cucu")).toBe(false);
  });
});

describe("#689 sumbuWaktu diperoleh dari data, bukan tanggal mati", () => {
  const hariIni = new Date("2026-10-11T00:00:00");

  const tugasBerjadwal = [
    tugas("t1", { startDate: new Date("2026-08-04"), endDate: new Date("2026-08-28") }),
    tugas("t2", { startDate: new Date("2026-09-01"), endDate: new Date("2026-09-15") }),
  ];

  it("rentang mengikut jadwal, tidak lagi dipaksa membuka Maret 2026", () => {
    const { minDate, maxDate, punyaTanggal } = sumbuWaktu(tugasBerjadwal, hariIni);
    expect(punyaTanggal).toBe(true);
    expect(minDate.getMonth()).toBe(7); // Agustus
    expect(maxDate.getFullYear()).toBe(2026);
    // Kode lama selalu menarik sumbu ke 2026-03-01. Cek ini gagal di sana.
    expect(minDate.getTime()).toBeGreaterThan(new Date("2026-05-31").getTime());
  });

  it("penyangga tetap ada: akhir sumbu melampaui endDate paling jauh", () => {
    const { maxDate } = sumbuWaktu(tugasBerjadwal, hariIni);
    expect(maxDate.getTime()).toBeGreaterThan(new Date("2026-09-15").getTime());
  });

  it("proyek tanpa tugas memakai bulan ini dan menandai dirinya kosong", () => {
    const { minDate, punyaTanggal } = sumbuWaktu([], hariIni);
    expect(punyaTanggal).toBe(false);
    expect(minDate.getMonth()).toBe(9); // Oktober
  });

  it("titik sumbu bulan dan hari tumbuh sesuai rentangnya", () => {
    const { months, days, totalDays } = sumbuWaktu(tugasBerjadwal, hariIni);
    expect(months.length).toBeGreaterThanOrEqual(2);
    expect(days).toHaveLength(totalDays + 1);
    expect(days[0].getTime()).toBeLessThanOrEqual(days[days.length - 1].getTime());
  });

  it("hanya startDate atau hanya endDate tetap terbaca", () => {
    const separuh = [tugas("x", { startDate: new Date("2026-07-01") })];
    const { minDate, punyaTanggal } = sumbuWaktu(separuh, hariIni);
    expect(punyaTanggal).toBe(true);
    expect(minDate.getMonth()).toBe(6);
  });
});

/**
 * Pagar sumber. Tiga cacat yang ditutup E5 semuanya berbentuk "kode yang boleh
 * kembali": tanggal mati yang di-hardcode, pemindaian per baris, dan `will-change`
 * yang ditempel tanpa syarat. Test perilaku di atas tidak bisa menangkap
 * ke-tiganya kalau seseorang menambahkan jalur baru di luar fungsi ini, jadi
 * bentuk `TimelinePanel.tsx` ikut dikunci.
 */
describe("#689 pagar sumber TimelinePanel", () => {
  const panel = fs.readFileSync(path.resolve(__dirname, "..", "TimelinePanel.tsx"), "utf8");

  it("tidak ada lagi tanggal mati di sumbu", () => {
    expect(panel).not.toMatch(/2026-03-01/);
    expect(panel).not.toMatch(/2026-05-31/);
    expect(panel).not.toMatch(/targetMin|targetMax/);
  });

  it("sumbu diambil sekali per perubahan tugas, bukan per render", () => {
    expect(panel).toMatch(
      /const sumbu = React\.useMemo\(\(\) => sumbuWaktu\(tasks\), \[tasks\]\);/
    );
    expect(panel).not.toMatch(/= getTimelineBounds\(\);/);
  });

  it("'punya anak' ditanyakan ke indeks, bukan ke array penuh", () => {
    expect(panel).toMatch(/indukDikenal\.has\(task\.id\)/);
    expect(panel).not.toMatch(/tasks\.some\(\(t\) => t\.parentId === task\.id\)/);
  });

  it("setiap will-change berada di dalam syarat, bukan ditempel tanpa syarat", () => {
    const baris = panel.split(/\r?\n/).filter((l) => l.includes("willChange"));
    expect(baris.length).toBeGreaterThan(0);
    const tanpaSyarat = baris.filter((l) => !l.includes("? {"));
    expect(tanpaSyarat).toEqual([]);
  });
});
