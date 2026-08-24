/**
 * Gerbang #173 — setiap host CDN yang dipakai kode harus diizinkan CSP.
 *
 * Latarnya: `<script src="https://cdn.lordicon.com/lordicon.js">` di
 * index.html dan `<lord-icon>` di dalam dialog SweetAlert berjalan mulus di
 * `vite dev` — di sana TIDAK ADA header CSP sama sekali. Header itu baru
 * dipasang Vercel dari vercel.json, sehingga dialognya tampil beda di
 * produksi tanpa satu pun test yang gagal.
 *
 * Yang memperlama penemuannya: penangan galat global di index.html
 * membungkam pesan yang mengandung "lordicon", jadi penolakan CSP-nya bahkan
 * tidak muncul sebagai galat di konsol.
 *
 * Test ini membaca kedua berkas apa adanya — bukan daftar host yang ditulis
 * tangan di sini — supaya host CDN baru yang lupa didaftarkan ke CSP gagal
 * di sini, bukan di produksi.
 */
import fs from "fs";
import path from "path";

const akar = path.resolve(__dirname, "..", "..");

function baca(relatif: string): string {
  return fs.readFileSync(path.join(akar, relatif), "utf8");
}

/** Host CDN yang dirujuk kode aplikasi, dikumpulkan dari sumbernya. */
function hostCdnYangDipakai(): string[] {
  const sumber = [baca("index.html"), baca(path.join("src", "lib", "sweetalert.ts"))].join("\n");

  const cocok = sumber.match(/https:\/\/cdn\.[a-z0-9.-]+/gi) ?? [];
  return [...new Set(cocok.map((u) => u.replace(/\/+$/, "")))];
}

function scriptSrc(): string {
  const csp: string = JSON.parse(baca("vercel.json")).headers[0].headers.find(
    (h: { key: string }) => h.key === "Content-Security-Policy"
  ).value;

  const arahan = csp
    .split(";")
    .map((d: string) => d.trim())
    .find((d: string) => d.startsWith("script-src"));

  if (!arahan) throw new Error("vercel.json tidak punya arahan script-src");
  return arahan;
}

describe("#173 CSP produksi mengizinkan host CDN yang dipakai kode", () => {
  it("menemukan host CDN untuk diperiksa (jaring pengaman regex)", () => {
    // Tanpa ini, regex yang rusak membuat test di bawah lulus dengan nol host.
    expect(hostCdnYangDipakai().length).toBeGreaterThan(0);
  });

  it("mendaftarkan setiap host CDN di script-src", () => {
    const arahan = scriptSrc();
    for (const host of hostCdnYangDipakai()) {
      expect(arahan).toContain(host);
    }
  });

  it("secara khusus mengizinkan cdn.lordicon.com — ikon dialog SweetAlert", () => {
    expect(scriptSrc()).toContain("https://cdn.lordicon.com");
  });
});
