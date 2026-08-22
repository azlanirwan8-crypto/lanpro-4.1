// Membuktikan modul rute benar-benar dapat dimuat runtime ESM (bukan hanya tsc).
import("../server/routes/master-data.routes")
  .then((m) => { console.log("MUAT OK, default:", typeof m.default); process.exit(0); })
  .catch((e) => { console.error("MUAT GAGAL:", e.message); process.exit(1); });
