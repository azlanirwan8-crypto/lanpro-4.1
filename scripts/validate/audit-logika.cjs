/**
 * GERBANG LOGIKA — `npm run audit:logika`
 *
 * KENAPA ADA.
 *
 * Repo ini pernah mengumpulkan kode mati tanpa ada yang menghentikannya:
 * #20 (DB Explorer), #21 (authStore & uiStore), #286 (tiga kelas ErrorBoundary
 * yang hanya satu terpakai). `tsc --noEmit` tidak memeriksa apakah sebuah
 * export diimpor; eslint `no-unused-vars` hanya melihat SATU berkas. Artinya
 * fungsi/kelas/variabel yang di-export tapi TIDAK diimpor siapa pun bisa
 * tumbuh diam-diam.
 *
 * CARA KERJANYA: RATCHET PER BERKAS, seperti `audit:warna`.
 *
 * 1. Pindai semua `export` bernama di `src/` dan `server/`.
 * 2. Pindai semua `import { ... }` di seluruh repo.
 * 3. Export yang tidak punya satu pun import = dead export.
 * 4. Hasilnya dibandingkan dengan `logika-baseline.json`:
 *    - jumlah TURUN  -> lulus, baseline boleh diperbarui
 *    - jumlah NAIK   -> GAGAL
 *    - berkas BARU   -> GAGAL
 *
 * PENGECUALIAN YANG DISENGAJA:
 * - Berkas entrypoint (main.tsx, server.ts, App.tsx, vite.config.ts)
 * - Berkas *.test.* dan *.spec.* (test tidak diimpor)
 * - Export `default` (sulit dilacak statis secara andal)
 * - `export type` / `export interface` (bisa di-import sebagai `import type`)
 * - Berkas di `scripts/` (skrip CLI berdiri sendiri)
 * - Berkas di `node_modules/`
 *
 * BATASNYA, supaya tidak dikira lebih dari yang ia buktikan:
 * - Import dinamis `import()` tidak terlacak
 * - `require()` tidak terlacak
 * - Re-export dari barrel `index.ts` dihitung sebagai pemakaian
 * - Simbol yang dipakai LEWAT destructuring objek tidak terlacak
 *
 * MEMPERBARUI GARIS DASAR: `npm run audit:logika -- --perbarui`
 */

const fs = require("fs");
const path = require("path");

const warna = {
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  kuning: (t) => `\x1b[33m${t}\x1b[0m`,
  tebal: (t) => `\x1b[1m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
};

const AKAR = path.resolve(__dirname, "..", "..");
const DIPINDAI = [path.join(AKAR, "src"), path.join(AKAR, "server")];
const GARIS_DASAR = path.join(__dirname, "logika-baseline.json");

// Berkas yang sengaja tidak diperiksa — alasannya tertulis.
const BERKAS_DIKECUALIKAN = [
  // Entrypoint — di-import oleh bundler/runtime, bukan oleh kode lain
  /[/\\]main\.tsx$/,
  /[/\\]server\.ts$/,
  /[/\\]App\.tsx$/,
  /[/\\]vite\.config\./,
  // Test — tidak diimpor siapa pun
  /\.test\./,
  /\.spec\./,
  // Skrip CLI — berdiri sendiri
  /[/\\]scripts[/\\]/,
  // Seed — berdiri sendiri
  /[/\\]seed/,
];

function berkasSumber(dir, keluar = []) {
  if (!fs.existsSync(dir)) return keluar;
  for (const entri of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entri.name);
    if (entri.isDirectory()) {
      if (entri.name !== "node_modules" && entri.name !== ".git") {
        berkasSumber(p, keluar);
      }
    } else if (/\.(ts|tsx|js|jsx)$/.test(entri.name)) {
      keluar.push(p);
    }
  }
  return keluar;
}

function dikecualikan(berkas) {
  return BERKAS_DIKECUALIKAN.some((p) => p.test(berkas));
}

function kumpulkanExport(daftarBerkas) {
  // Map<namaRelatif, Set<namaSimbol>>
  const hasil = new Map();

  for (const berkas of daftarBerkas) {
    if (dikecualikan(berkas)) continue;

    const isi = fs.readFileSync(berkas, "utf8");
    const baris = isi.split("\n");
    const namaSimbol = new Set();

    for (const brs of baris) {
      const potong = brs.trim();

      // Lewati komentar
      if (potong.startsWith("//") || potong.startsWith("*") || potong.startsWith("/*")) continue;

      // Lewati export type/interface — terlalu sulit dilacak statis
      if (/^export\s+(type|interface)\s+/.test(potong)) continue;

      // Lewati export default
      if (/^export\s+default\s+/.test(potong)) continue;

      // Lewati re-export: export { ... } from "..."
      if (/^export\s+\{[^}]*\}\s+from\s+/.test(potong)) continue;
      if (/^export\s+\*/.test(potong)) continue;

      // Tangkap export bernama
      const cocok = potong.match(
        /^export\s+(?:const|let|var|function\*?|class|enum|async\s+function)\s+([A-Za-z_$][A-Za-z0-9_$]*)/
      );
      if (cocok) {
        namaSimbol.add(cocok[1]);
      }
    }

    if (namaSimbol.size > 0) {
      hasil.set(path.relative(AKAR, berkas).replace(/\\/g, "/"), namaSimbol);
    }
  }

  return hasil;
}

function kumpulkanImport(daftarBerkas) {
  // Set<namaSimbol> — semua nama yang pernah diimpor
  const diimpor = new Set();

  for (const berkas of daftarBerkas) {
    const isi = fs.readFileSync(berkas, "utf8");

    // import { A, B as C, D } from "..."
    for (const m of isi.matchAll(/import\s+(?:type\s+)?{([^}]+)}\s+from\s+/g)) {
      for (const bagian of m[1].split(",")) {
        // "B as C" -> aslinya "B"
        const nama = bagian.trim().split(/\s+as\s+/)[0].trim();
        if (nama) diimpor.add(nama);
      }
    }
  }

  return diimpor;
}

function main() {
  const semuaBerkas = [];
  for (const dir of DIPINDAI) {
    berkasSumber(dir, semuaBerkas);
  }

  if (semuaBerkas.length === 0) {
    console.error(warna.merah("GAGAL: nol berkas sumber ditemukan."));
    process.exit(1);
  }

  const eksporPerBerkas = kumpulkanExport(semuaBerkas);
  const diimpor = kumpulkanImport(semuaBerkas);

  // Hitung dead exports per berkas
  const matiPerBerkas = {};
  let totalMati = 0;
  let totalEkspor = 0;

  for (const [berkas, simbolSet] of eksporPerBerkas) {
    const mati = [];
    for (const simbol of simbolSet) {
      totalEkspor++;
      if (!diimpor.has(simbol)) {
        mati.push(simbol);
        totalMati++;
      }
    }
    if (mati.length > 0) {
      matiPerBerkas[berkas] = mati.sort();
    }
  }

  // --- Mekanisme ratchet ---
  const perbarui = process.argv.includes("--perbarui");
  let baseline = {};
  if (fs.existsSync(GARIS_DASAR)) {
    baseline = JSON.parse(fs.readFileSync(GARIS_DASAR, "utf8"));
  }

  const memburuk = [];
  const berkasBaru = [];

  // Kalau baseline kosong, ini pemindaian pertama — buat baseline
  const baselineKosong = Object.keys(baseline).length === 0;

  if (!baselineKosong) {
    for (const [berkas, daftarMati] of Object.entries(matiPerBerkas)) {
      const batasLama = baseline[berkas];
      if (batasLama === undefined) {
        berkasBaru.push({ berkas, jumlah: daftarMati.length, simbol: daftarMati });
      } else if (daftarMati.length > batasLama) {
        memburuk.push({
          berkas,
          lama: batasLama,
          baru: daftarMati.length,
          simbol: daftarMati,
        });
      }
    }
  }

  // --- Laporan ---
  const garis = "─".repeat(58);
  console.log(`\n${warna.tebal("Gerbang logika (dead exports)")}`);
  console.log(
    warna.redup(
      `  ${totalEkspor} export diperiksa · ${totalMati} tanpa import (${Object.keys(matiPerBerkas).length} berkas)`
    )
  );

  const gagal = memburuk.length > 0 || berkasBaru.length > 0;

  if (gagal && !perbarui) {
    console.log("");

    for (const t of memburuk) {
      console.log(`  ${warna.merah("NAIK")}  ${t.berkas}  ${t.lama} → ${t.baru}`);
      for (const s of t.simbol) {
        console.log(warna.redup(`         export ${s}`));
      }
    }

    for (const t of berkasBaru) {
      console.log(`  ${warna.merah("BARU")}  ${t.berkas}  (${t.jumlah} dead export)`);
      for (const s of t.simbol) {
        console.log(warna.redup(`         export ${s}`));
      }
    }

    console.log(`\n${garis}`);
    console.log(
      warna.merah(
        warna.tebal(`GAGAL — ${memburuk.length + berkasBaru.length} berkas memburuk atau baru.`)
      )
    );
    console.log(
      warna.redup(
        "Export yang di-export tapi tidak diimpor siapa pun adalah kode mati."
      )
    );
    console.log(
      warna.redup(
        "Hapus export-nya, atau hapus berkasnya. Kalau memang dipakai secara dinamis,"
      )
    );
    console.log(
      warna.redup(
        "perbarui baseline: npm run audit:logika -- --perbarui"
      )
    );
    console.log(`${garis}\n`);
    process.exit(1);
  }

  // Perbarui baseline — angka hanya boleh turun atau berkas baru
  if (perbarui || baselineKosong) {
    const baselineBaru = {};
    for (const [berkas, daftarMati] of Object.entries(matiPerBerkas)) {
      baselineBaru[berkas] = daftarMati.length;
    }
    // Urutkan berdasarkan nama berkas agar mudah dibaca
    const diurutkan = {};
    for (const k of Object.keys(baselineBaru).sort()) {
      diurutkan[k] = baselineBaru[k];
    }
    fs.writeFileSync(GARIS_DASAR, JSON.stringify(diurutkan, null, 2) + "\n");
    console.log(`\n${garis}`);
    console.log(
      warna.kuning(
        warna.tebal(
          `Baseline diperbarui: ${Object.keys(diurutkan).length} berkas, ${totalMati} dead export.`
        )
      )
    );
    console.log(`${garis}\n`);
    return;
  }

  console.log(`\n${garis}`);
  console.log(warna.hijau(warna.tebal("LULUS — tidak ada dead export baru.")));
  console.log(
    warna.redup(
      `${totalMati} dead export tersisa di ${Object.keys(matiPerBerkas).length} berkas (baseline).`
    )
  );
  console.log(
    warna.redup(
      "Ini BUKAN bukti semua export terpakai, hanya bukti jumlahnya tidak bertambah."
    )
  );
  console.log(`${garis}\n`);
}

main();
