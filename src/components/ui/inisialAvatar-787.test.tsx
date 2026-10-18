/**
 * #787 — lingkaran inisial hanya boleh lahir dari `UserAvatar`.
 *
 * Pemilik proyek, 18 Okt: "cek pada semua menu secara detail masih ada kah yang
 * begini". Dua layar masih menulis piringan inisialnya sendiri:
 * `IssueMobileCardView.tsx` (foto pakai `ring-1`, inisial pakai `bg-primary/20`
 * + `text-[9px] font-bold` — dua tampilan untuk orang yang sama) dan
 * `EnterpriseAuditDashboard.tsx` (huruf pertama TANPA `toUpperCase()`, jadi
 * "budi santoso" tampil "b" putih di atas blok pekat — gaya yang sudah ditolak
 * pada #770). Lima blok inisial lain ternyata dihitung lalu tidak pernah dibaca.
 *
 * Penjaga ini mengunci tiga hal: tidak ada `rounded-full` baru yang menghitung
 * huruf sendiri, `getInitials()` tetap satu rumus, dan kedua layar itu memakai
 * `UserAvatar`.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { getInitials } from "./UserAvatar";

const AKAR = join(__dirname, "..", "..");
const TSX: string[] = [];
const jalan = (d: string) => {
  for (const n of readdirSync(d)) {
    if (["node_modules", "dist", ".git"].includes(n)) continue;
    const p = join(d, n);
    if (statSync(p).isDirectory()) jalan(p);
    else if (/\.tsx$/.test(n) && !/\.test\./.test(n)) TSX.push(p);
  }
};
jalan(AKAR);

const baca = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

/** Huruf pertama diambil untuk ditempel di dalam elemen bulat. */
const HURUF = /\[0\]|\bcharAt\(0\)|substring\(0,\s*1\)|slice\(0,\s*1\)|getInitials|inisial/i;

/** Elemen ber-`rounded-full` yang 6 baris berikutnya menghitung huruf pertama. */
const piringan = (isi: string, mulai: number) =>
  HURUF.test(
    isi
      .split("\n")
      .slice(mulai, mulai + 7)
      .join("\n")
  );

describe("inisial avatar hanya dari UserAvatar (#787)", () => {
  it("tidak ada lingkaran inisial buatan sendiri di luar UserAvatar", () => {
    const pelanggar: string[] = [];
    for (const f of TSX) {
      if (f.endsWith(join("components", "ui", "UserAvatar.tsx"))) continue;
      const isi = baca(f);
      const baris = isi.split("\n");
      baris.forEach((l, i) => {
        if (!/rounded-full/.test(l)) return;
        // tong progres, titik status dan blob dekoratif juga bulat — yang dilarang
        // hanya yang MENGGAMBAR huruf, dan itu terlihat dari isi bloknya
        if (!piringan(isi, i)) return;
        if (!/<(div|span)\b/.test(l)) return;
        pelanggar.push(`${f}:${i + 1}  ${l.trim().slice(0, 90)}`);
      });
    }
    expect(pelanggar).toEqual([]);
  });

  it("penjaga ini benar-benar menangkap piringan buatan sendiri (regresi test-diri)", () => {
    const contoh = [
      '<div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[9px] font-bold">',
      '  {(assignee.name || "U")[0].toUpperCase()}',
      "</div>",
    ].join("\n");
    expect(piringan(contoh, 0)).toBe(true);
    // tong progres: bulat, tapi tidak menggambarkan huruf
    const tong = [
      '<div className="h-2 bg-surface-strong rounded-full overflow-hidden">',
      '<div style={{ width: "40%" }} />',
    ].join("\n");
    expect(piringan(tong, 0)).toBe(false);
  });

  it("dua layar yang dilaporkan memakai UserAvatar, bukan kelas palet sendiri", () => {
    const kartu = baca(
      join(AKAR, "features", "issues", "components", "list", "IssueMobileCardView.tsx")
    );
    expect(kartu).toContain("<UserAvatar");
    expect(kartu).not.toContain("bg-primary/20");
    expect(kartu).not.toContain("ring-1 ring-border-subtle");

    const audit = baca(join(AKAR, "features", "enterprise-audit", "EnterpriseAuditDashboard.tsx"));
    expect(audit).toContain("<UserAvatar");
    expect(audit).not.toContain("bg-primary-surface rounded-full");
  });

  it("sisa blok inisial yang tidak pernah dibaca sudah dicabut", () => {
    const hilang: [string, string][] = [
      [join("components", "LiveChatWidget.tsx"), "const initials ="],
      [join("features", "team", "TeamManagementPanel.tsx"), "initialsMatch"],
      [join("features", "wiki", "WikiView.tsx"), "getUserInitials"],
      [join("features", "flowchart", "lib", "nodeTheme.ts"), "getInitials"],
    ];
    for (const [relatif, tanda] of hilang) {
      expect(baca(join(AKAR, relatif))).not.toContain(tanda);
    }
    // TeamManagementPanel punya dua blok mati, keduanya harus pergi
    const tmp = baca(join(AKAR, "features", "team", "TeamManagementPanel.tsx"));
    expect(tmp.split("initialsMatch").length - 1).toBe(0);
  });

  it("satu rumus inisial untuk seluruh aplikasi", () => {
    const sumber = TSX.concat(join(AKAR, "features", "flowchart", "lib", "nodeTheme.ts")).filter(
      (f, i, all) => all.indexOf(f) === i
    );
    const punya = sumber.filter((f) =>
      /(?:export\s+)?(?:const|function)\s+getInitials\b/.test(baca(f))
    );
    expect(punya.map((f) => f.split("src")[1].replace(/\\/g, "/"))).toEqual([
      "/components/ui/UserAvatar.tsx",
    ]);
  });

  /*
   * Empat kasus ini tadinya hidup di `nodeTheme.test.ts` untuk salinan flowchart
   * yang tidak pernah dipakai. Salinan itu dicabut (#787), dan angkanya dipindah
   * ke rumus yang benar-benar jalan — dengan satu perbedaan yang SENGAJA:
   * `UserAvatar` mengembalikan "?" bila nama tidak ada, sementara salinan
   * flowchart memakai "LP" (LanPro) sehingga dua orang tanpa nama tampil sebagai
   * orang yang sama.
   */
  it("rumus inisial yang tersisa memberi hasil yang dijanjikan", () => {
    expect(getInitials("Rifky Pramadanianto")).toBe("RP");
    expect(getInitials("Administrator")).toBe("AD");
    expect(getInitials("  Rido   Oktobriananta  ")).toBe("RO");
    expect(getInitials()).toBe("?");
    expect(getInitials("")).toBe("?");
    expect(getInitials("   ")).toBe("?");
  });
});
