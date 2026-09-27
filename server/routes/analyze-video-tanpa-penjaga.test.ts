/**
 * Regresi Item #233 — `analyze-video` tidak boleh punya jalur yang lolos penjaga.
 *
 * DITEMUKAN 28 Agu 2026 lewat audit `/qa`. Rute ini didaftarkan sebagai ARRAY
 * dua jalur: `router.post(["/analyze-video", "/api/v1/meetings/:meetingId/analyze-video"], ...)`.
 * Penjaga global di `server.ts:426` hanya menyaring URL yang diawali `/api/`,
 * sehingga alias telanjang itu melewatinya sepenuhnya.
 *
 * TERBUKTI DENGAN PROBE, dua permintaan ke handler yang SAMA:
 *   POST /api/v1/meetings/1/analyze-video  -> 401 srv.akses_ditolak_token_autentikasi
 *   POST /analyze-video                    -> 400 srv.id_meeting_meetingid_diperlukan
 * Balasan 400 itu buktinya: permintaan sudah masuk ke validasi DI DALAM
 * handler, bukan ditolak di gerbang. Tanpa token sama sekali.
 *
 * DAMPAKNYA. Handler mengambil `meetingId` (dulu juga dari body/query), memuat
 * rapatnya, membaca berkas rekaman, lalu menjalankan analisis multimodal
 * Gemini. Siapa pun tanpa akun bisa menebak id, membaca isi rapat proyek mana
 * pun lintas proyek, dan membebani kuota API berbayar.
 *
 * KENAPA GERBANG YANG ADA TIDAK MELIHATNYA — dan ini bagian terpenting.
 * `rute-tanpa-penjaga.test.ts` menuntut setiap rute berlingkup proyek punya
 * penjaga, dan `/api/v1/meetings/` MEMANG terdaftar di `POLA_ENTITAS`-nya.
 * Tetapi penguraiannya menuntut jalur berupa string dalam kutip tepat sesudah
 * `(`; bentuk ARRAY tidak cocok dengan polanya, sehingga rute ini tidak pernah
 * masuk himpunan yang diperiksa. Gerbangnya hijau justru karena rutenya tak
 * terlihat — pengurai yang buta sebagian lebih berbahaya daripada tidak ada
 * pengurai, persis pelajaran yang sudah tercatat di berkas gerbang itu sendiri.
 *
 * Maka test ini menjaga DUA hal sekaligus: bahwa aliasnya tidak kembali, DAN
 * bahwa rutenya tetap TERLIHAT oleh gerbang #94. Yang kedua yang mencegah
 * kelasnya lahir lagi.
 *
 * Diperiksa statis terhadap teks sumber: yang dijaga adalah BENTUK
 * PENDAFTARAN rutenya, bukan hasil kueri.
 */
import fs from "fs";
import path from "path";

const AKAR = path.resolve(__dirname, "..", "..");
const sumber = fs.readFileSync(path.join(AKAR, "server", "routes", "meetings.routes.ts"), "utf8");

/** Baris kode saja — komentar dibuang, sebab blok penjelasan di atas rute ini
 *  menyebut alias lamanya dan menghitungnya akan membuat test merah selamanya. */
const kode = sumber.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Pengurai yang SAMA dengan rute-tanpa-penjaga.test.ts (#94), disalin sengaja:
 *  test ini ikut menjaga bahwa rute analyze-video terlihat oleh pengurai itu. */
const POLA_RUTE =
  /(?:app|router)\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']([\s\S]{0,900}?)(?:async\s*\(|\(req|\w+\s*\)\s*;)/g;

const ruteTerdata = () =>
  [...kode.matchAll(POLA_RUTE)].map((m) => ({
    metode: m[1].toUpperCase(),
    jalur: m[2],
    penjaga: m[3],
  }));

describe("#233 alias telanjang /analyze-video tidak boleh ada", () => {
  it("tidak mendaftarkan jalur di luar /api/", () => {
    const luar = ruteTerdata().filter((r) => !r.jalur.startsWith("/api/"));
    expect(luar.map((r) => `${r.metode} ${r.jalur}`)).toEqual([]);
  });

  it("tidak mendaftarkan rute dalam bentuk ARRAY jalur", () => {
    // Bentuk array-lah yang membuat #233 tak terlihat gerbang #94. Melarangnya
    // di berkas ini menutup kelasnya, bukan cuma satu kejadiannya.
    expect(kode).not.toMatch(/(?:app|router)\.(?:get|post|put|patch|delete)\(\s*\[/);
  });
});

describe("#233 rute analyze-video dijaga dan terlihat gerbang", () => {
  const rute = () => ruteTerdata().find((r) => r.jalur.endsWith("/analyze-video"));

  it("terdata oleh pengurai #94 — inilah yang dulu tidak terjadi", () => {
    expect(rute()).toBeDefined();
    expect(rute()!.jalur).toBe("/api/v1/meetings/:meetingId/analyze-video");
  });

  it("memakai jagaProyek, sama seperti saudara kandungnya", () => {
    expect(rute()!.penjaga).toMatch(/jagaProyek\(/);
  });
});

describe("#233 handler membaca meetingId dari sumber yang divalidasi penjaga", () => {
  it("meetingId hanya dari path, bukan body atau query", () => {
    // `jagaProyek` memvalidasi lingkup dari parameter PATH. Bila handler
    // membaca id dari body, ia bisa mengerjakan rapat LAIN daripada yang
    // barusan divalidasi — penjaga dan handler harus membaca nilai yang sama.
    const i = kode.indexOf('"/api/v1/meetings/:meetingId/analyze-video"');
    expect(i).toBeGreaterThan(-1);
    const blok = kode.slice(i, i + 1200);
    expect(blok).toMatch(/const meetingId = req\.params\.meetingId\s*;/);
    expect(blok).not.toMatch(/req\.body\.meetingId/);
    expect(blok).not.toMatch(/req\.query\.meetingId/);
  });
});
