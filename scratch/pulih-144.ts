import { getPgPool } from "../src/lib/db";
(async () => {
  const p = getPgPool();
  // Kategori sebelum #144 tidak pernah tersimpan (kolomnya belum ada), jadi
  // keadaan semula yang jujur adalah NULL, bukan "Panduan" yang dikeraskan.
  await p.query(`UPDATE "Documents" SET category=NULL WHERE id='557b2ede-e1c8-46fc-ab2a-974e42230c0c'`);
  console.log("dipulihkan:", JSON.stringify(
    (await p.query(`SELECT title, category FROM "Documents" WHERE id='557b2ede-e1c8-46fc-ab2a-974e42230c0c'`)).rows[0]));
  process.exit(0);
})();
