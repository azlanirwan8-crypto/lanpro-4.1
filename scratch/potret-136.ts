import { getPgPool } from "../src/lib/db";
(async () => {
  const p = getPgPool();
  const kolom = await p.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='Documents' AND column_name IN ('description','canvasData')`
  );
  const baris = await p.query(
    `SELECT id, title, type,
            left(coalesce(description,''), 40) AS deskripsi,
            length(coalesce(description,'')) AS panjang_desk,
            length(coalesce(description,'')) AS panjang_desk2
       FROM "Documents" ORDER BY "createdAt" DESC LIMIT 10`
  );
  console.log("kolom:", kolom.rows.map((r: any) => r.column_name));
  console.table(baris.rows);
  process.exit(0);
})().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
