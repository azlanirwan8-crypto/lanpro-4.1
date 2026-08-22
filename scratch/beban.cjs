// Membebani CPU selama N detik agar kontensi jest bisa direproduksi.
const os = require("os");
const { fork } = require("child_process");
const detik = Number(process.argv[2] || 90);
if (process.argv[3] === "child") {
  const henti = Date.now() + detik * 1000;
  while (Date.now() < henti) { Math.sqrt(Math.random() * 1e9); }
  process.exit(0);
}
const n = Math.max(2, os.cpus().length);
for (let i = 0; i < n; i++) fork(__filename, [String(detik), "child"], { stdio: "ignore" });
console.log("beban " + n + " proses selama " + detik + " detik");
