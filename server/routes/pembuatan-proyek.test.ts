/**
 * Penjaga untuk item #80 (§13.15): pembuatan proyek hanya milik Administrator.
 *
 * Ketetapan §19.4 menempatkan `C` pada "(buat proyek)" HANYA di Administrator.
 * Jalur utama `POST /api/projects` sudah menegakkannya sejak #34. Yang bocor
 * adalah jalur kedua: `POST /api/projects/generate-bni-demo` hanya
 * ber-`authenticateJWT`, sehingga siapa pun yang login bisa membuat proyek.
 *
 * KENAPA IA LUPUT SELAMA INI — dan kenapa test ini berbentuk begini.
 *
 * Gelombang 5 (§13.11) sudah mendata rute itu sebagai "tanpa penjaga rute". Ia
 * ADA di daftar, lalu digugurkan tanpa dibaca isinya karena namanya terbaca
 * seperti utilitas demo. Padahal layanan di baliknya benar-benar
 * `INSERT INTO Projects`.
 *
 * Karena itu test ini tidak cukup memeriksa dua rute yang sudah diketahui. Ia
 * juga mengunci JUMLAH rute pembuat proyek — mengikuti §0.6 yang mewajibkan
 * perbandingan HIMPUNAN RUTE, bukan pemeriksaan satu per satu. Rute POST ketiga
 * di bawah `/api/projects` akan memerahkan test ini sampai seseorang memutuskan
 * apakah ia pembuat proyek dan perlu dijaga.
 *
 * CATATAN JUJUR SOAL BATASNYA. Ini pemeriksaan STATIS terhadap teks rute, sama
 * seperti `hak-hapus.test.ts`. Ia menangkap penjaga yang dicabut kembali dan
 * rute pembuat proyek baru yang lupa dijaga — dua kegagalan yang paling mungkin
 * terjadi. Ia TIDAK membuktikan bahwa seorang non-admin sungguh ditolak;
 * pembuktian perilaku `verifyGlobalAdmin` ada di `auth.test.ts`.
 *
 * Meng-import modul rute untuk memeriksa tumpukan Express-nya SENGAJA dihindari:
 * `project.routes.ts` menarik adaptor DB dan membuka koneksi Postgres di dalam
 * Jest — persis sebab `getJwtSecret` dulu harus dipisah (§0.3), ketika 22 test
 * lulus tetapi exit code-nya 1.
 */

import fs from "fs";
import path from "path";

const SUMBER = fs.readFileSync(path.join(__dirname, "project.routes.ts"), "utf8");

/**
 * Rute POST yang bisa MEMBUAT proyek, beserta rangkaian middleware-nya.
 *
 * Rute yang jalurnya menyebut parameter proyek (`:projectId` / `:id`) sengaja
 * dikecualikan: ia beralamat ke proyek yang SUDAH ADA, jadi mustahil
 * menciptakan proyek baru. `POST /api/projects/:projectId/methodology` adalah
 * contohnya — ia mengubah metodologi, dan penjaganya memang `verifyProjectAccess`,
 * bukan `verifyGlobalAdmin`.
 *
 * Pengecualian ini berdasarkan BENTUK jalur, bukan daftar nama. Daftar nama akan
 * mengulang #80: rute baru yang namanya tidak dikenali akan lolos diam-diam.
 */
function rutePostProyek(): { jalur: string; penjaga: string }[] {
  const hasil: { jalur: string; penjaga: string }[] = [];
  const pola = /router\.post\(\s*["']([^"']*\/api\/projects[^"']*)["']([\s\S]*?)(?:async|\(req)/g;
  let m: RegExpExecArray | null;
  while ((m = pola.exec(SUMBER)) !== null) {
    const jalur = m[1];
    if (/:\w+/.test(jalur)) continue; // beralamat ke proyek yang sudah ada
    hasil.push({ jalur, penjaga: m[2] });
  }
  return hasil;
}

describe("#80 pembuatan proyek hanya milik Administrator", () => {
  it("pengurainya benar-benar menemukan rute — bukan lulus karena nol hasil", () => {
    // Tanpa penjaga ini, regex yang rusak akan membuat seluruh test di bawah
    // "lulus" dengan memeriksa himpunan kosong. Itu bentuk kegagalan §13.14.
    expect(rutePostProyek().length).toBeGreaterThan(0);
  });

  it("jalur demo `generate-bni-demo` dijaga `verifyGlobalAdmin`", () => {
    const rute = rutePostProyek().find((r) => r.jalur.includes("generate-bni-demo"));
    expect(rute).toBeDefined();
    expect(rute!.penjaga).toContain("verifyGlobalAdmin");
  });

  it("jalur utama `POST /api/projects` tetap dijaga — tidak boleh ikut tercabut", () => {
    const rute = rutePostProyek().find((r) => r.jalur === "/api/projects");
    expect(rute).toBeDefined();
    expect(rute!.penjaga).toContain("verifyGlobalAdmin");
  });

  it("HANYA dua rute POST pembuat proyek yang dikenal — himpunan dikunci (§0.6)", () => {
    // Bila ini merah, ada rute POST /api/projects baru. Baca ISINYA: kalau ia
    // membuat proyek, ia wajib `verifyGlobalAdmin` dan didaftarkan di sini.
    // JANGAN sekadar menaikkan angkanya — itu persis cara #80 lahir.
    const jalur = rutePostProyek()
      .map((r) => r.jalur)
      .sort();
    expect(jalur).toEqual(["/api/projects", "/api/projects/generate-bni-demo"]);
  });

  it("tidak ada rute pembuat proyek yang hanya ber-`authenticateJWT`", () => {
    const telanjang = rutePostProyek()
      .filter((r) => !r.penjaga.includes("verifyGlobalAdmin"))
      .map((r) => r.jalur);
    expect(telanjang).toEqual([]);
  });
});
