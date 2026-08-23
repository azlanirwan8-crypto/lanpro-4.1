/**
 * GERBANG NAVIGASI — `npm run audit:navigasi`
 *
 * KENAPA ADA.
 *
 * Item #159. Tombol "Lihat Roadmap" di Dashboard, lima pintasan Kanban, dan
 * kartu rapat di widget samping semuanya memanggil `setCurrentView` dengan
 * nilai yang TIDAK PERNAH ADA cabangnya:
 *
 *   ditulis          id sebenarnya
 *   ---------------  -------------
 *   "kanban"         "board"
 *   "roadmap"        "timeline"
 *   "meetings"       "meetingNotes"
 *
 * Namanya masuk akal — itu justru sebabnya. Yang dipakai adalah nama MENU
 * seperti terbaca pengguna, sementara `switch` di `AppRoutes.tsx` memakai id
 * teknisnya. Keduanya tidak pernah dipertemukan apa pun.
 *
 * KENAPA GAGALNYA SENYAP.
 *
 * `switch` itu berakhir dengan `default: return null`. Jadi nilai yang tidak
 * dikenal tidak melempar dan tidak memicu error boundary — ia merender
 * KEKOSONGAN. Kerangka aplikasi tetap utuh: sidebar ada, header ada, isinya
 * hilang. Bagi pengguna itu terbaca "halamannya blank", dan bagi pengembang
 * tidak ada satu pun sinyal:
 *
 *   - `tsc` lolos, sebab tipe view melebar ke `any` di jalur pemanggilnya
 *   - eslint tidak tahu nilai mana yang sah
 *   - error boundary tidak pernah tersentuh — tidak ada yang dilempar
 *   - Jest tidak pernah menekan tombol-tombol pintasan itu
 *
 * CARA KERJANYA.
 *
 * Daftar cabang dibaca dari `AppRoutes.tsx` sendiri, dan daftar view yang
 * ditangani di luar `switch` dibaca dari `AppContainer.tsx` lewat pola
 * `currentView === "..."`. Keduanya TIDAK didaftar ulang di sini, supaya
 * menambah halaman baru tidak menuntut menyunting berkas ini.
 *
 * Setiap `setCurrentView("literal")` di seluruh `src` lalu dicocokkan ke
 * gabungan itu. Yang tidak ketemu dilaporkan beserta berkas dan barisnya.
 *
 * BATASNYA, supaya tidak dikira lebih dari yang ia buktikan: hanya argumen
 * berupa STRING HARFIAH yang bisa diperiksa. `setCurrentView(item.id)` di
 * sidebar lewat begitu saja — id-nya baru diketahui saat aplikasi berjalan.
 * Untuk jalur itu, `src/routes/AppRoutes.navigasi.test.tsx` yang menjaganya
 * dengan membandingkan id sidebar terhadap daftar cabang.
 */

const fs = require("fs");
const path = require("path");

const warna = {
  merah: (t) => `\x1b[31m${t}\x1b[0m`,
  hijau: (t) => `\x1b[32m${t}\x1b[0m`,
  tebal: (t) => `\x1b[1m${t}\x1b[0m`,
  redup: (t) => `\x1b[2m${t}\x1b[0m`,
};

const AKAR = path.resolve(__dirname, "..", "..");
const RUTE = path.join(AKAR, "src", "routes", "AppRoutes.tsx");
const KONTAINER = path.join(AKAR, "src", "AppContainer.tsx");
const DIPINDAI = path.join(AKAR, "src");

function viewYangDitangani() {
  const rute = fs.readFileSync(RUTE, "utf8");
  const kontainer = fs.readFileSync(KONTAINER, "utf8");

  const dikenal = new Set();
  for (const m of rute.matchAll(/case "([^"]+)":/g)) dikenal.add(m[1]);
  // Sebagian view dirender AppContainer sendiri, di luar `switch` — dikenali
  // dari perbandingan langsungnya, bukan dari daftar yang ditulis tangan.
  for (const m of kontainer.matchAll(/currentView\s*===\s*"([^"]+)"/g)) dikenal.add(m[1]);
  for (const m of kontainer.matchAll(/currentView\s*!==\s*"([^"]+)"/g)) dikenal.add(m[1]);
  return dikenal;
}

function berkasSumber(dir, keluar = []) {
  for (const entri of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entri.name);
    if (entri.isDirectory()) {
      if (entri.name !== "node_modules") berkasSumber(p, keluar);
    } else if (/\.(ts|tsx)$/.test(entri.name) && !/\.test\./.test(entri.name)) {
      keluar.push(p);
    }
  }
  return keluar;
}

function main() {
  const dikenal = viewYangDitangani();
  if (dikenal.size === 0) {
    console.error(warna.merah("GAGAL: nol cabang view terbaca dari AppRoutes/AppContainer."));
    console.error(warna.redup("  Gerbang ini tidak boleh lulus tanpa sumber kebenarannya."));
    process.exit(1);
  }

  const temuan = [];
  let diperiksa = 0;
  for (const berkas of berkasSumber(DIPINDAI)) {
    fs.readFileSync(berkas, "utf8")
      .split("\n")
      .forEach((isi, i) => {
        for (const m of isi.matchAll(/setCurrentView\(\s*"([^"]+)"/g)) {
          diperiksa++;
          if (!dikenal.has(m[1])) {
            temuan.push({ berkas: path.relative(AKAR, berkas), baris: i + 1, view: m[1] });
          }
        }
      });
  }

  const garis = "─".repeat(58);
  console.log(`\n${warna.tebal("Gerbang navigasi")}`);
  console.log(
    warna.redup(`  ${dikenal.size} view dikenali · ${diperiksa} pemanggilan harfiah diperiksa`)
  );

  if (temuan.length === 0) {
    console.log(`\n${garis}`);
    console.log(warna.hijau(warna.tebal("LULUS — setiap tujuan navigasi punya cabang.")));
    console.log(warna.redup("Argumen non-harfiah tidak terperiksa di sini; lihat AppRoutes.navigasi.test.tsx."));
    console.log(`${garis}\n`);
    return;
  }

  console.log("");
  for (const t of temuan) {
    console.log(`  ${warna.merah("BUNTU")}  ${t.berkas}:${t.baris}`);
    console.log(warna.redup(`         setCurrentView("${t.view}") — tidak ada cabangnya`));
  }
  console.log(`\n${garis}`);
  console.log(warna.merah(warna.tebal(`${temuan.length} tujuan navigasi berujung layar kosong.`)));
  console.log(warna.redup("`switch` di AppRoutes berakhir `default: return null`, jadi nilai yang"));
  console.log(warna.redup("tidak dikenal merender KEKOSONGAN — tanpa melempar, tanpa error boundary."));
  console.log(`${garis}\n`);
  process.exit(1);
}

main();
