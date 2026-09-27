/**
 * Gerbang item #234 — penjaga otentikasi global tidak boleh bisa dilewati.
 *
 * Penjaga di `server.ts` hanya memeriksa permintaan yang jalurnya diawali
 * `/api/`. Syarat itu TIDAK BISA dihapus: segala yang bukan `/api/` adalah
 * halaman SPA dan aset statis, dan memaksanya lewat `authenticateJWT` membuat
 * aplikasinya tidak pernah bisa dimuat.
 *
 * Konsekuensinya sebuah rute API yang lahir di luar `/api/` tidak pernah
 * disentuh penjaga itu — publik tanpa ada yang memutuskannya. Itu bukan
 * kekhawatiran teoretis: persis begitulah #233 terjadi. Rute analisis video
 * didaftarkan dengan alias telanjang `/analyze-video`, dan selama bertahun
 * siapa pun tanpa akun bisa memanggilnya.
 *
 * Karena runtime tidak bisa membedakan "rute API" dari "aset statis", yang
 * memeriksanya adalah gerbang ini: ia membaca PENDAFTARAN rutenya, tempat
 * perbedaan itu terlihat jelas.
 *
 * BAGIAN KEDUA berkas ini menjaga isi daftar-putihnya sendiri. Salah ketik
 * satu huruf di `RUTE_PUBLIK` tidak akan membuat apa pun merah dengan
 * sendirinya — ia hanya membuat rute yang seharusnya publik menjadi dijaga,
 * dan gejalanya muncul sebagai "login tiba-tiba gagal" yang jauh dari
 * sebabnya. Maka setiap anggota daftar itu dicocokkan dengan rute yang
 * benar-benar terdaftar.
 *
 * Penguraiannya sengaja MENERIMA bentuk array `router.post([a, b], ...)`.
 * Gerbang #94 tidak menerimanya, dan justru itulah sebab #233 luput darinya
 * (lihat #242). Mewarisi titik buta yang sama di sini akan membuat gerbang ini
 * hijau karena tidak melihat, bukan karena aman.
 */
import fs from "fs";
import path from "path";

const AKAR = path.resolve(__dirname, "..", "..");
const DIR = path.join(AKAR, "server", "routes");

const POLA = /(?:app|router)\.(get|post|put|patch|delete)\(\s*(\[[^\]]*\]|["'][^"']+["'])/g;

interface Rute {
  berkas: string;
  metode: string;
  jalur: string;
}

const semuaRute = (): Rute[] => {
  const hasil: Rute[] = [];
  for (const berkas of fs.readdirSync(DIR).filter((f) => f.endsWith(".routes.ts"))) {
    const sumber = fs.readFileSync(path.join(DIR, berkas), "utf8");
    for (const m of sumber.matchAll(POLA)) {
      const mentah = m[2];
      const jalur = mentah.startsWith("[")
        ? mentah
            .replace(/[[\]"']/g, "")
            .split(",")
            .map((x) => x.trim())
        : [mentah.replace(/["']/g, "")];
      for (const j of jalur) if (j) hasil.push({ berkas, metode: m[1].toUpperCase(), jalur: j });
    }
  }
  return hasil;
};

/**
 * Rute di luar `/api/` yang memang disengaja.
 *
 * `/metrics` memakai penjaganya SENDIRI (`METRIK_TOKEN`, dikunci
 * `metrics-guard.test.ts`) dan sengaja tidak memakai JWT: yang memanggilnya
 * sistem pemantau, bukan peramban yang login.
 */
const DIKECUALIKAN = new Set(["/metrics"]);

describe("#234 tidak ada rute API yang lahir di luar /api/", () => {
  it("pengurainya menemukan rute — bukan lulus karena himpunan kosong", () => {
    expect(semuaRute().length).toBeGreaterThan(50);
  });

  it("pengurainya melihat bentuk ARRAY juga — titik buta yang melahirkan #233", () => {
    // Dijaga eksplisit supaya pola di atas tidak kelak disederhanakan menjadi
    // hanya-string dan diam-diam berhenti memeriksa separuh kemungkinan.
    const contoh = 'router.post(["/a", "/api/b"], async (req, res) => {})';
    const cocok = [...contoh.matchAll(POLA)];
    expect(cocok.length).toBe(1);
    expect(cocok[0][2]).toContain("/api/b");
  });

  it("TIDAK ADA rute di luar /api/ selain yang dikecualikan", () => {
    const luar = semuaRute()
      .filter((r) => !r.jalur.startsWith("/api/"))
      .filter((r) => !DIKECUALIKAN.has(r.jalur))
      // Penanganan socket.io (`io.on("connection")`) bukan rute HTTP; polanya
      // ikut tertangkap sebab bentuknya mirip, jadi disaring di sini.
      .filter((r) => r.jalur.startsWith("/"))
      .map((r) => `${r.berkas} ${r.metode} ${r.jalur}`);
    expect(luar).toEqual([]);
  });
});

describe("#234 daftar-putih di server.ts jujur terhadap rute yang ada", () => {
  const serverTs = fs.readFileSync(path.join(AKAR, "server.ts"), "utf8");

  const daftarPublik = (): string[] => {
    const i = serverTs.indexOf("const RUTE_PUBLIK = new Set([");
    expect(i).toBeGreaterThan(-1);
    const blok = serverTs.slice(i, serverTs.indexOf("]);", i));
    return [...blok.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  };

  it("daftarnya tidak kosong dan terbaca", () => {
    expect(daftarPublik().length).toBeGreaterThan(5);
  });

  it("setiap rute publik benar-benar terdaftar sebagai rute", () => {
    // Salah ketik di sini tidak membuat apa pun merah dengan sendirinya; ia
    // hanya membuat rute yang seharusnya publik menjadi dijaga, dan gejalanya
    // muncul sebagai "login tiba-tiba gagal" yang jauh dari sebabnya.
    const nyata = new Set(semuaRute().map((r) => r.jalur));
    const hantu = daftarPublik().filter((p) => !nyata.has(p));
    expect(hantu).toEqual([]);
  });

  it("login dan alur pemulihan sandi tetap publik", () => {
    // Kalau salah satu ini hilang dari daftar, tidak ada seorang pun bisa masuk.
    const p = daftarPublik();
    for (const wajib of [
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/forgot-password",
      "/api/auth/reset-password",
    ]) {
      expect(p).toContain(wajib);
    }
  });

  it("verify dan refresh SENGAJA tidak publik — keduanya menjaga dirinya sendiri", () => {
    const p = daftarPublik();
    expect(p).not.toContain("/api/auth/verify");
    expect(p).not.toContain("/api/auth/refresh");
  });

  it("tidak memakai pencocokan awalan lagi", () => {
    // Bentuk lama: publicRoutes.some(route => req.url.startsWith(route))
    expect(serverTs).not.toMatch(/publicRoutes\.some\([^)]*startsWith/);
  });
});
