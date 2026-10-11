/**
 * #689 butir (g) — toast sukses Planning baru boleh berbunyi sesudah server
 * mengiyakan.
 *
 * INI TEST STATIS, BUKAN BUKTI UI. Keempat handler itu hidup di dalam
 * `AppContainer.tsx` (5.293 baris) dan mencapainya lewat render berarti
 * menavigasi sidebar lalu men-seed tujuh endpoint berbeda — ongkosnya jauh
 * lebih besar daripada isi yang diuji, dan rapuh. Yang dikunci di sini adalah
 * ATURAN YANG PELAKSANA NYA LUPA: `toast.success` di dalam badan handler
 * `async` harus berada SESUDAH `await` pertama. Pagar model begini sudah punya
 * preseden di repo ini (`useLingkupTugas.688.test.ts` melarang `useAuth`
 * diimpor ulang).
 *
 * Yang BELUM dibuktikan pagar ini: tampilan toast sungguhan di peramban, dan
 * urutan rollback-nya. Itu tetap tercatat sebagai belum terverifikasi.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const SUMBER = fs.readFileSync(path.resolve(__dirname, "AppContainer.tsx"), "utf8");

const badanHandler = (nama: string): string => {
  const mulai = SUMBER.indexOf(`const ${nama} = async (`);
  if (mulai < 0) throw new Error(`handler ${nama} tidak ditemukan — jangan diam-diam`);
  const berikut = SUMBER.indexOf("\n  const handle", mulai + 1);
  return SUMBER.slice(mulai, berikut < 0 ? undefined : berikut);
};

const HANDLER = [
  "handleCreateSprint",
  "handleUpdateSprint",
  "handleStartSprint",
  "handleCompleteSprint",
];

/**
 * `await` PERTAMA yang menunggu SERVICE, bukan `await` apa pun.
 *
 * Aturan naif "sukses harus sesudah await" ternyata lolos di `main` untuk
 * `handleCompleteSprint`, karena handler itu menunggu dialog konfirmasi
 * (`await confirmCompleteSprintAlert(...)`) lebih dulu — await yang tidak
 * menyentuh jaringan sama sekali. Pagar yang bisa dibohongi oleh await lokal
 * lebih berbahaya daripada tidak ada pagar, jadi yang dihitung adalah await ke
 * `createSprint`/`updateSprint`.
 */
const AWAIT_SERVICE = /await\s+(?:[A-Za-z0-9_.\s]*?)?(?:updateSprint|createSprint)\s*\(/;

describe("#689 toast sukses Planning menunggu konfirmasi server", () => {
  it.each(HANDLER)("%s tidak membunyikan sukses sebelum service menjawab", (nama) => {
    const badan = badanHandler(nama);
    const awaitService = badan.search(AWAIT_SERVICE);
    const suksesPertama = badan.indexOf("toast.success(");

    expect(awaitService).toBeGreaterThanOrEqual(0);
    expect(suksesPertama).toBeGreaterThanOrEqual(0);
    expect(suksesPertama).toBeGreaterThan(awaitService);
  });

  it("empaten backlog fase tidak lagi dibuang tanpa kabar", () => {
    const badan = badanHandler("handleCreateSprint");
    // `void Promise.all(...)` adalah bentuk yang menghapus kegagalan.
    expect(badan).not.toMatch(/void\s+Promise\.all/);
    expect(badan).toMatch(/Promise\.allSettled/);
    expect(badan).toMatch(/sprintBacklogPartial/);
  });

  it("empat kunci kamus yang dipakai handler ini ada di kedua bahasa", () => {
    const id = fs.readFileSync(path.resolve(__dirname, "i18n/locales/id.ts"), "utf8");
    const en = fs.readFileSync(path.resolve(__dirname, "i18n/locales/en.ts"), "utf8");
    for (const kunci of [
      "sprintCreated",
      "sprintUpdated",
      "sprintStarted",
      "sprintBacklogPartial",
    ]) {
      expect(id).toContain(`${kunci}:`);
      expect(en).toContain(`${kunci}:`);
    }
  });
});
