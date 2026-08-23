/**
 * Pemindai menyeluruh teks UI berbahasa keras — item #148.
 *
 * KENAPA ADA. Pemilik proyek menemukan kebocoran bahasa TIGA KALI setelah saya
 * melaporkan bersih. Setiap kali penyebabnya sama: sebuah BENTUK teks yang
 * belum pernah saya pindai. Mula-mula kunci i18n mentah, lalu toast, lalu teks
 * yang dirakit dari potongan.
 *
 * Jadi berkas ini tidak menambah satu pola lagi, melainkan mendaftar SELURUH
 * bentuk yang bisa memuat teks untuk pengguna, lalu memindai semuanya. Setiap
 * bentuk diberi nama supaya laporannya bisa ditelusuri.
 *
 * Yang SENGAJA tidak dianggap kebocoran:
 *   - nilai yang berasal dari basis data (nama sprint, label MasterData)
 *   - kode/status yang memang disimpan apa adanya (To Do, In Progress)
 *   - nama produk, akronim teknis, dan satuan
 *   - konstanta CADANGAN_*, yang memang hanya dipakai bila MasterData kosong
 */
const fs = require("fs");
const path = require("path");

const AKRONIM =
  /^(?:[\s\d.,:;%/+\-–—•·|()[\]{}#*]*|To Do|In Progress|In Review|Done|Blocked|Backlog|Cancelled|ID|EN|OK|QA|API|URL|URI|UI|UX|AI|PDF|CSV|XML|JSON|SQL|SVG|PNG|JPG|JPEG|WEBP|GIF|MB|KB|GB|px|SIT|UAT|PTR|DEV|PROD|STG|BRD|FSD|TSD|PRD|WA|HP|CSS|HTML|JS|TS|LANPRO|LAN PRO|Miro|Neon|PostgreSQL|MySQL|Redis|Resend|WhatsApp|Google|Microsoft|Figma|Excel|Word|Vercel|GitHub|Jira|Low|Medium|High|Epic|Story|Task|Bug|Subtask|Standard)$/i;

const KODE =
  /[=;{}()<>[\]]|=>|\breturn\b|\bconst\b|\blet\b|\bfunction\b|className|props\.|\.map\b|\.filter\b|https?:|^\.|^\/|^[a-z]+([A-Z][a-z]+)+$|^[a-z_]+\.[a-z_]+$/;

const layak = (s) => {
  if (!s) return false;
  const t = s.trim();
  if (t.length < 3 || t.length > 120) return false;
  if (AKRONIM.test(t)) return false;
  if (KODE.test(t)) return false;
  // harus memuat kata beneran
  if (!/[A-Za-zÀ-ÿ]{3,}/.test(t)) return false;
  return true;
};

const berkas = [];
(function telusuri(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) {
      if (!/node_modules|dist/.test(f.name)) telusuri(p);
    } else if (/\.tsx?$/.test(p) && !/\.test\./.test(p) && !/[\\/]i18n[\\/]/.test(p)) {
      berkas.push(p);
    }
  }
})("src");

/** Setiap bentuk: nama + fungsi yang memulangkan daftar teks dari satu baris. */
const BENTUK = [
  {
    nama: "prop-string",
    // <Komponen label="Teks" /> untuk prop apa pun yang lazim menampung teks
    re: /\b(label|title|placeholder|heading|subtitle|caption|tooltip|text|message|description|emptyText|loadingText|confirmText|cancelText|okText|buttonText|ariaLabel|alt)=\{?["'`]([^"'`\n]{3,120})["'`]\}?/g,
    ambil: (m) => m[2],
  },
  {
    nama: "ternary-jsx",
    // {kondisi ? "Aktif" : "Nonaktif"}
    re: /\?\s*["']([^"'\n]{3,120})["']\s*:\s*["']([^"'\n]{3,120})["']/g,
    ambil: (m) => [m[1], m[2]],
  },
  {
    nama: "objek-label",
    // { label: "Teks" } / { name: "Teks" } di dalam array konfigurasi
    re: /\b(label|name|title|text|judul|nama)\s*:\s*["'`]([^"'`\n]{3,120})["'`]/g,
    ambil: (m) => m[2],
  },
  {
    nama: "throw-error",
    re: /throw new Error\(\s*["'`]([^"'`\n]{3,160})["'`]/g,
    ambil: (m) => m[1],
  },
  {
    nama: "param-bawaan",
    // fungsi ({ loadingText = "Mengautentikasi..." })
    re: /\w+\s*=\s*["']([A-Za-zÀ-ÿ][^"'\n]{4,120})["']\s*[,)}]/g,
    ambil: (m) => m[1],
  },
  {
    nama: "template-jsx",
    // {`Halo ${x}`} di posisi anak JSX
    re: /\{\s*`([^`\n]{3,120})`\s*\}/g,
    ambil: (m) => m[1].replace(/\$\{[^}]*\}/g, "…"),
  },
];

const hasil = [];
for (const p of berkas) {
  const s = fs.readFileSync(p, "utf8");
  s.split("\n").forEach((ln, i) => {
    const tr = ln.trim();
    if (/^(\/\/|\*|\/\*)/.test(tr)) return;
    if (/\bt\(["'`]/.test(ln) && !/=\s*["']/.test(ln)) return; // sudah lewat t()
    if (/CADANGAN_/.test(ln)) return;
    for (const b of BENTUK) {
      b.re.lastIndex = 0;
      let m;
      while ((m = b.re.exec(ln))) {
        const teks = [].concat(b.ambil(m));
        for (const x of teks) {
          if (!layak(x)) continue;
          hasil.push({
            bentuk: b.nama,
            berkas: p.split(path.sep).join("/"),
            baris: i + 1,
            teks: x.trim(),
          });
        }
      }
    }
  });
}

fs.writeFileSync("scratch/menyeluruh.json", JSON.stringify(hasil, null, 1));

const perBentuk = {};
for (const h of hasil) (perBentuk[h.bentuk] = perBentuk[h.bentuk] || []).push(h);
console.log("total kandidat:", hasil.length);
console.log("");
for (const [b, v] of Object.entries(perBentuk).sort((a, c) => c[1].length - a[1].length)) {
  const unik = new Set(v.map((x) => x.teks)).size;
  console.log("  " + b.padEnd(16) + String(v.length).padStart(4) + "  (" + unik + " unik)");
}
