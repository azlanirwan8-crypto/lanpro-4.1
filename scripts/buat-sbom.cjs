#!/usr/bin/env node
/**
 * Pembuat SBOM — §18.9 langkah 3.
 *
 * SBOM (*Software Bill of Materials*) adalah daftar isi perangkat lunak: apa
 * saja yang ikut terkirim ke production dan pada versi berapa. Gunanya baru
 * terasa saat ada CVE baru diumumkan — pertanyaan "apakah kita memakainya?"
 * dijawab dari berkas, bukan dari menebak atau menjalankan ulang instalasi
 * yang isinya mungkin sudah berbeda.
 *
 * Formatnya CycloneDX 1.5, standar yang sama dengan yang dipakai `npm sbom`
 * dan dikenali pemindai umum. Dibuat sendiri di sini, bukan lewat dependensi
 * baru: ARCHITECTURE.md menegaskan penambahan dependensi harus punya alasan
 * kuat, dan untuk daftar dari `package-lock.json` alasan itu tidak ada.
 *
 * HANYA dependensi production yang masuk. Alat build dan test tidak terkirim
 * ke pengguna, jadi memasukkannya membuat SBOM menakut-nakuti tanpa sebab.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const akar = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(akar, "package.json"), "utf8"));
const lockPath = path.join(akar, "package-lock.json");

if (!fs.existsSync(lockPath)) {
  console.error("package-lock.json tidak ditemukan — SBOM tidak bisa dibuat dari tebakan.");
  process.exit(1);
}

const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
const paket = lock.packages || {};

/** Ubah kunci lockfile (`node_modules/a/node_modules/b`) menjadi nama paket. */
const namaDariKunci = (kunci) => {
  const bagian = kunci.split("node_modules/");
  return bagian[bagian.length - 1];
};

const komponen = [];
const terlihat = new Set();

for (const [kunci, info] of Object.entries(paket)) {
  if (!kunci.startsWith("node_modules/")) continue;
  if (info.dev) continue; // hanya yang ikut ke production
  if (!info.version) continue;

  const nama = namaDariKunci(kunci);
  const identitas = `${nama}@${info.version}`;
  if (terlihat.has(identitas)) continue;
  terlihat.add(identitas);

  const purl = `pkg:npm/${nama.replace("@", "%40")}@${info.version}`;
  const c = {
    type: "library",
    "bom-ref": purl,
    name: nama,
    version: info.version,
    purl,
  };
  if (info.license) c.licenses = [{ license: { id: String(info.license) } }];
  if (info.integrity) {
    // Integritas lockfile berformat `sha512-<base64>`; diterjemahkan ke hex
    // supaya sesuai bentuk hash CycloneDX.
    const m = /^(sha\d+)-(.+)$/.exec(info.integrity);
    if (m) {
      const alg = m[1] === "sha512" ? "SHA-512" : m[1] === "sha256" ? "SHA-256" : null;
      if (alg) c.hashes = [{ alg, content: Buffer.from(m[2], "base64").toString("hex") }];
    }
  }
  komponen.push(c);
}

komponen.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));

const sbom = {
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  serialNumber: `urn:uuid:${crypto.randomUUID()}`,
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    tools: [{ vendor: "LanPro", name: "scripts/buat-sbom.cjs", version: "1.0.0" }],
    component: {
      type: "application",
      "bom-ref": `pkg:npm/${pkg.name}@${pkg.version}`,
      name: pkg.name,
      version: pkg.version,
    },
  },
  components: komponen,
};

const keluaran = path.join(akar, "sbom.cyclonedx.json");
fs.writeFileSync(keluaran, JSON.stringify(sbom, null, 2) + "\n");

console.log("");
console.log("SBOM dibuat: sbom.cyclonedx.json");
console.log(`  format     CycloneDX 1.5`);
console.log(`  komponen   ${komponen.length} dependensi production`);
console.log(`  aplikasi   ${pkg.name}@${pkg.version}`);
console.log("");
