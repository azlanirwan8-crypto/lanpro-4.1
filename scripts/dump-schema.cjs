/**
 * Membuat docs/DATABASE_SCHEMA.md dari DATABASE HIDUP.
 *
 * Sengaja dibaca dari information_schema, bukan dari pemindaian teks di kode.
 * Dokumen schema yang disusun dari kode hanya menggambarkan apa yang DIMAKSUD,
 * bukan apa yang ADA — dan perbedaan keduanya persis yang melahirkan tabel
 * kembar di repo ini.
 */
const { Pool } = require("pg");
require("dotenv").config();

const KEMBAR = {
  masterdata: "MasterData",
  projectmodules: "ProjectModules",
  qatestcases: "QATestCases",
  qatestsuites: "QATestSuites",
  qatestcaseexecutionlogs: "QATestCaseExecutionLogs",
};

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });

  const q = async (sql, p) => (await pool.query(sql, p)).rows;

  try {
    const tabel = await q(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_type='BASE TABLE'
      ORDER BY table_name`);

    const baris = {};
    for (const t of tabel) {
      try {
        const r = await q(`SELECT COUNT(*)::int AS n FROM "${t.table_name}"`);
        baris[t.table_name] = r[0].n;
      } catch {
        baris[t.table_name] = -1;
      }
    }

    const kolomSemua = await q(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public'
      ORDER BY table_name, ordinal_position`);

    const constraint = await q(`
      SELECT tc.table_name, tc.constraint_type, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema='public' AND tc.constraint_type IN ('PRIMARY KEY','UNIQUE','FOREIGN KEY')
      ORDER BY tc.table_name`);

    const aktif = tabel.filter((t) => !KEMBAR[t.table_name]).map((t) => t.table_name);
    const kembarAda = tabel.filter((t) => KEMBAR[t.table_name]).map((t) => t.table_name);

    const L = [];
    L.push("# Schema Database LanPro");
    L.push("");
    L.push("**Dibaca langsung dari database hidup (Neon PostgreSQL) pada 16 Agustus 2026.**");
    L.push("");
    L.push("Dokumen ini TIDAK disusun dari pemindaian kode. Schema yang digambarkan dari");
    L.push("kode hanya menunjukkan apa yang DIMAKSUD, bukan apa yang benar-benar ADA —");
    L.push("dan selisih keduanya persis yang melahirkan tabel kembar di bawah.");
    L.push("");
    L.push("Perbarui dengan menjalankan ulang pemeriksaan yang sama; jangan disunting");
    L.push("manual, karena dokumen yang menyimpang dari kenyataan lebih berbahaya");
    L.push("daripada tidak ada dokumen.");
    L.push("");
    L.push("---");
    L.push("");
    L.push("## Ringkasan");
    L.push("");
    L.push("| | Jumlah |");
    L.push("|---|---:|");
    L.push(`| Tabel seluruhnya | ${tabel.length} |`);
    L.push(`| Tabel aktif | ${aktif.length} |`);
    L.push(`| 🔴 Tabel kembar (kosong, warisan) | ${kembarAda.length} |`);
    L.push("");
    L.push("---");
    L.push("");
    L.push("## 🔴 Tabel kembar — jangan dipakai");
    L.push("");
    L.push("PostgreSQL memperlakukan `\"MasterData\"` dan `masterdata` sebagai **dua tabel");
    L.push("berbeda**: identifier tanpa kutip otomatis diubah menjadi huruf kecil.");
    L.push("");
    L.push("Repo ini pernah punya dua sistem migrasi. `pg-migrate.ts` menulis nama tabel");
    L.push("**dengan** kutip, sementara `server/migrations/runner.ts` menulisnya **tanpa**");
    L.push("kutip. Keduanya berjalan pada database yang sama, sehingga tiap tabel");
    L.push("terbentuk dua kali dalam dua ejaan.");
    L.push("");
    L.push("`runner.ts` sudah dihapus 16 Agu 2026, jadi tabel kembar tidak akan lahir");
    L.push("lagi. Yang sudah terlanjur ada masih tertinggal:");
    L.push("");
    L.push("| Kembar (kosong) | Yang dipakai | Baris di yang dipakai |");
    L.push("|---|---|---:|");
    for (const k of kembarAda) {
      L.push(`| \`${k}\` | \`"${KEMBAR[k]}"\` | ${baris[KEMBAR[k]] ?? "?"} |`);
    }
    L.push("");
    L.push("Seluruhnya **kosong** — tidak ada data yang akan hilang bila dibuang. Tetapi");
    L.push("`DROP TABLE` bersifat permanen, jadi menunggu persetujuan pemilik proyek");
    L.push("(item #48).");
    L.push("");
    L.push("---");
    L.push("");
    L.push("## Penamaan");
    L.push("");
    const pascal = aktif.filter((t) => /^[A-Z]/.test(t));
    const snake = aktif.filter((t) => /^[a-z]/.test(t));
    L.push(`Repo ini memakai **dua gaya sekaligus**: ${pascal.length} tabel PascalCase dan`);
    L.push(`${snake.length} tabel snake_case.`);
    L.push("");
    L.push("| Gaya | Tabel |");
    L.push("|---|---|");
    L.push(`| PascalCase (mayoritas) | ${pascal.length} tabel |`);
    L.push(`| snake_case | ${snake.map((t) => "`" + t + "`").join(", ")} |`);
    L.push("");
    L.push("**Aturan untuk tabel BARU: PascalCase dengan kutip ganda**, mengikuti");
    L.push("mayoritas. Tanpa kutip, PostgreSQL akan menurunkannya menjadi huruf kecil");
    L.push("dan menghasilkan kembaran seperti di atas.");
    L.push("");
    L.push("```sql");
    L.push('CREATE TABLE IF NOT EXISTS "NamaTabel" (   -- benar');
    L.push("CREATE TABLE IF NOT EXISTS NamaTabel   (   -- SALAH, jadi namatabel");
    L.push("```");
    L.push("");
    L.push("---");
    L.push("");
    L.push("## Daftar tabel");
    L.push("");
    L.push("| Tabel | Kolom | Baris |");
    L.push("|---|---:|---:|");
    for (const t of aktif) {
      const n = kolomSemua.filter((c) => c.table_name === t).length;
      L.push(`| \`${t}\` | ${n} | ${baris[t]} |`);
    }
    L.push("");
    L.push("---");
    L.push("");
    L.push("## Rincian kolom");
    L.push("");
    for (const t of aktif) {
      const kol = kolomSemua.filter((c) => c.table_name === t);
      const con = constraint.filter((c) => c.table_name === t);
      const pk = con.filter((c) => c.constraint_type === "PRIMARY KEY").map((c) => c.column_name);
      const uq = con.filter((c) => c.constraint_type === "UNIQUE").map((c) => c.column_name);
      const fk = con.filter((c) => c.constraint_type === "FOREIGN KEY").map((c) => c.column_name);

      L.push(`### \`${t}\``);
      L.push("");
      L.push(`${kol.length} kolom · ${baris[t]} baris`);
      L.push("");
      L.push("| Kolom | Tipe | Null | Kunci |");
      L.push("|---|---|:-:|---|");
      for (const c of kol) {
        const tanda = [];
        if (pk.includes(c.column_name)) tanda.push("PK");
        if (uq.includes(c.column_name)) tanda.push("UNIQUE");
        if (fk.includes(c.column_name)) tanda.push("FK");
        L.push(
          `| \`${c.column_name}\` | ${c.data_type} | ${c.is_nullable === "YES" ? "ya" : "—"} | ${tanda.join(", ") || "—"} |`
        );
      }
      L.push("");
    }

    require("fs").writeFileSync("docs/DATABASE_SCHEMA.md", L.join("\n"));
    console.log("docs/DATABASE_SCHEMA.md ditulis —", tabel.length, "tabel,", aktif.length, "aktif");
  } catch (e) {
    console.log("GAGAL:", e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
