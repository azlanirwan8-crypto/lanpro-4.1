import { getPgPool } from "../src/lib/db";
(async () => {
  const p = getPgPool();
  const r = await p.query(
    `SELECT id, title, type,
            coalesce(description,'(NULL)') AS deskripsi,
            length(coalesce("canvasData",'')) AS panjang_kanvas,
            left(coalesce("canvasData",''), 30) AS kanvas
       FROM "Documents" WHERE type='flowchart'`
  );
  console.table(r.rows);
  const sisa = await p.query(
    `SELECT count(*)::int AS n FROM "Documents" WHERE description LIKE '{%"nodes"%'`
  );
  console.log("baris yang masih menyimpan payload di description:", sisa.rows[0].n);
  process.exit(0);
})().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
