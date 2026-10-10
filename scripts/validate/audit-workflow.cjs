#!/usr/bin/env node
/**
 * Gerbang `audit:workflow` — item #686.
 *
 * KENAPA GERBANG INI ADA.
 *
 * `deploy.yml` ditolak GitHub selama berminggu-minggu dan TIDAK ADA SATU PUN
 * pemeriksaan lokal yang berteriak. Penyebabnya bukan YAML-nya — berkas itu
 * diurai dengan sempurna oleh parser mana pun. Yang ditolak adalah ekspresi
 * GitHub di dalam `if:`. Karena itu `js-yaml` (dan `npm run lint`, dan
 * `npm run build`) akan selalu hijau di atas berkas yang benar-benar mati:
 * kesalahannya hidup di bahasa yang hanya dimengerti GitHub.
 *
 * Akibatnya serius dan tidak terlihat: GitHub tidak menjalankan SATU PUN job,
 * jadi seluruh rantai (doctor, lint, test, build, gitleaks, audit:deps, SBOM,
 * build Docker, deploy) diam. Run merah dengan nol langkah terlihat seperti
 * "CI-nya sedang bermasalah", bukan seperti "pengawasanmu mati".
 *
 * ATURAN YANG DITEGAKKAN.
 *
 * Diambil dari tabel "Context availability" dokumen GitHub:
 *   jobs.<job>.if                  -> github, needs, vars, inputs
 *   jobs.<job>.steps.<step>.if     -> github, needs, strategy, matrix, job,
 *                                     runner, env, vars, steps, inputs
 * `secrets` TIDAK ada di keduanya, walaupun tersedia di `with:` dan `env:`.
 * Ini jebakan yang mudah dihindari tapi mudah juga tertulis: `if: secrets.X != ''`
 * terasa wajar, dan satu-satunya yang menolaknya adalah GitHub.
 *
 * Gerbang ini TIDAK membuktikan pipeline akan sukses — hanya bahwa berkasnya
 * bisa dibaca GitHub. Kredensial yang belum diset tetap membuat langkah
 * dilewati, dan itu memang maksudnya.
 */

const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

// Sama seperti gerbang lain di folder ini: warna didefinisikan lokal, tidak ada
// modul warna bersama yang bisa di-import.
const warna = {
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  kuning: (t) => `\x1b[33m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
};

const DIR_WORKFLOW = path.join(__dirname, "..", "..", ".github", "workflows");

/** Konteks yang boleh dipakai, per posisi `if:` (dokumen GitHub, Context availability). */
const BOLEH = {
  job: new Set(["github", "needs", "vars", "inputs"]),
  step: new Set([
    "github",
    "needs",
    "strategy",
    "matrix",
    "job",
    "runner",
    "env",
    "vars",
    "steps",
    "inputs",
  ]),
  // Fungsi yang namanya muncul sebagai `nama(`, bukan sebagai konteks.
};
const FUNGSI = new Set([
  "always",
  "cancelled",
  "success",
  "failure",
  "contains",
  "startsWith",
  "endsWith",
  "format",
  "join",
  "fromJSON",
  "toJSON",
  "hashFiles",
]);

/**
 * Ambil NAMA KONTEKS dari setiap jalur bertitik.
 *
 * Hanya segmen PERTAMA yang nama konteks. Versi pertama gerbang ini memakai
 * pola `(\w+)\.` biasa dan karenanya menuduh `steps.docker.outputs.siap`
 * memakai konteks bernama `docker` dan `outputs` — tuduhan palsu yang justru
 * muncul di perbaikan yang ia sendiri minta dipakai. Lookbehind menolak segmen
 * yang diawali titik, jadi `steps` tetap terbaca dan sisanya tidak.
 */
const konteksDalam = (ekspresi) => {
  // Buang string literal: `github.ref == 'refs/heads/main'` jangan ikut diperiksa.
  const tanpaKutip = String(ekspresi)
    .replace(/\$\{\{|\}\}/g, " ")
    .replace(/'[^']*'/g, " ")
    .replace(/"[^"]*"/g, " ");
  const hasil = new Set();
  const pola = /(?<![\w.-])([A-Za-z_][\w-]*)\s*\./g;
  let m;
  while ((m = pola.exec(tanpaKutip)) !== null) {
    const nama = m[1].toLowerCase();
    if (FUNGSI.has(nama)) continue;
    hasil.add(nama);
  }
  return hasil;
};

const periksa = (berkas) => {
  const galau = [];
  const teks = fs.readFileSync(berkas, "utf8");
  let data;
  try {
    data = yaml.load(teks);
  } catch (e) {
    return [`YAML tidak bisa diurai: ${e.message}`];
  }
  if (!data || typeof data !== "object" || !data.jobs) return galau;

  const namai = (n) => path.basename(berkas) + (n ? ` » ${n}` : "");

  for (const [idJob, job] of Object.entries(data.jobs)) {
    if (!job || typeof job !== "object") continue;

    if (job.if !== undefined) {
      for (const k of konteksDalam(job.if)) {
        if (!BOLEH.job.has(k)) {
          galau.push(
            `${namai(`job "${idJob}"`)} — \`if:\` level job memakai konteks ` +
              `\`${k}.\`. Yang diizinkan hanya: ${[...BOLEH.job].join(", ")}. ` +
              `GitHub menolak seluruh berkas karena satu baris ini.`
          );
        }
      }
    }

    for (const [index, langkah] of (job.steps || []).entries()) {
      if (!langkah || langkah.if === undefined) continue;
      const label = langkah.name || langkah.id || `langkah #${index + 1}`;
      for (const k of konteksDalam(langkah.if)) {
        if (!BOLEH.step.has(k)) {
          const pengganti =
            k === "secrets"
              ? "Pindahkan pemeriksaannya ke `env:` langkah (di sana `secrets` boleh), " +
                "atau setel output dari langkah `id` lalu pakai `steps.<id>.outputs.<kunci>`."
              : "Pakai konteks yang diizinkan di posisi ini.";
          galau.push(
            `${namai(`job "${idJob}" » "${label}"`)} — \`if:\` memakai konteks ` +
              `\`${k}.\` yang tidak tersedia di posisi itu. ${pengganti}`
          );
        }
      }
    }
  }
  return galau;
};

const berkas = fs
  .readdirSync(DIR_WORKFLOW)
  .filter((f) => /\.ya?ml$/i.test(f))
  .map((f) => path.join(DIR_WORKFLOW, f));

const semua = berkas.flatMap(periksa);

console.log(warna.redup(`Gerbang berkas workflow (${berkas.length} berkas di .github/workflows)`));

if (semua.length > 0) {
  for (const g of semua) console.log(`  ${warna.merah("GAGAL")} ${g}`);
  console.log("");
  console.log(
    warna.merah(
      "──────────────────────────────────────────────────────────\n" +
        "GAGAL — GitHub akan menolak berkas workflow ini dan TIDAK ada job yang\n" +
        "berjalan: seluruh CI/CD mati tanpa satu pun test sempat dieksekusi.\n" +
        "Periksa tabel \"Context availability\" di dokumen GitHub Actions; jangan\n" +
        "memakai `secrets` di dalam `if:`.\n" +
        "──────────────────────────────────────────────────────────"
    )
  );
  process.exit(1);
}

console.log(`  ${warna.hijau("LULUS")} — semua \`if:\` hanya memakai konteks yang diizinkan.`);
console.log(warna.redup("Ini BUKAN bukti pipeline akan sukses, hanya bukti GitHub mau membaca berkasnya."));
