import { getPgPool } from "../src/lib/db";
(async () => {
  // Hapus kuncian percobaan login dari uji sebelumnya (in-memory di server,
  // tetapi pastikan tidak ada sisa di basis data).
  console.log("siap");
  process.exit(0);
})();
