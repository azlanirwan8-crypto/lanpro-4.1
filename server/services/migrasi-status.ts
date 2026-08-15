/**
 * Status migrasi schema — supaya kegagalannya tidak lagi senyap (item #39).
 *
 * MASALAH YANG DIPECAHKAN. Auto-migrasi saat boot dibungkus `try/catch` yang
 * hanya memanggil `console.warn`, lalu server tetap menyala seolah sehat.
 * Akibatnya nyata dan sudah terjadi dua kali di repo ini: migrasi gagal dengan
 * "Connection terminated due to connection timeout", tabel `UserIdentities`
 * tidak terbentuk, dan tidak ada satu pun tanda di aplikasi. Kegagalannya baru
 * ketahuan setelah fitur yang membutuhkannya dicoba dan gagal dengan pesan yang
 * sama sekali tidak menyinggung migrasi.
 *
 * DUA PERBAIKAN DI SINI:
 *
 *   1. MENGULANG. Penyebab kegagalan yang teramati selalu sama: Neon
 *      membutuhkan waktu bangun dari kondisi idle, dan percobaan pertama
 *      kehabisan waktu. Mengulang beberapa kali dengan jeda menaik
 *      menyelesaikan sebagian besar kasus tanpa campur tangan siapa pun.
 *
 *   2. MENCATAT STATUSNYA. Setelah semua percobaan gagal, statusnya disimpan
 *      dan bisa dibaca — lewat `/api/health` dan `npm run doctor`. Server tetap
 *      menyala, karena mematikannya akan membuat aplikasi yang schema-nya
 *      sebenarnya sudah benar ikut mati hanya karena satu timeout. Yang berubah:
 *      kegagalan itu kini TERLIHAT.
 */

export type StatusMigrasi = "belum" | "berjalan" | "berhasil" | "gagal";

interface KeadaanMigrasi {
  status: StatusMigrasi;
  percobaan: number;
  galatTerakhir: string | null;
  selesaiPada: string | null;
}

const keadaan: KeadaanMigrasi = {
  status: "belum",
  percobaan: 0,
  galatTerakhir: null,
  selesaiPada: null,
};

/** Dibaca `/api/health` dan `npm run doctor`. Salinan, bukan rujukan. */
export function statusMigrasi(): KeadaanMigrasi {
  return { ...keadaan };
}

/** Hanya untuk test — mengembalikan keadaan ke awal. */
export function resetStatusMigrasi(): void {
  keadaan.status = "belum";
  keadaan.percobaan = 0;
  keadaan.galatTerakhir = null;
  keadaan.selesaiPada = null;
}

const jeda = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Menjalankan migrasi dengan pengulangan.
 *
 * `jalankan` sengaja diterima sebagai parameter, bukan di-import di dalam,
 * supaya perilaku pengulangan bisa diuji tanpa menyentuh database sungguhan.
 */
export async function jalankanMigrasiDenganUlangan(
  jalankan: () => Promise<void>,
  opsi: { maksPercobaan?: number; jedaAwalMs?: number } = {}
): Promise<KeadaanMigrasi> {
  const maksPercobaan = opsi.maksPercobaan ?? 3;
  const jedaAwalMs = opsi.jedaAwalMs ?? 2000;

  keadaan.status = "berjalan";
  keadaan.percobaan = 0;
  keadaan.galatTerakhir = null;

  for (let ke = 1; ke <= maksPercobaan; ke++) {
    keadaan.percobaan = ke;
    try {
      await jalankan();
      keadaan.status = "berhasil";
      keadaan.galatTerakhir = null;
      keadaan.selesaiPada = new Date().toISOString();
      console.log(`[MIGRASI] Berhasil pada percobaan ke-${ke}.`);
      return statusMigrasi();
    } catch (err: any) {
      keadaan.galatTerakhir = err?.message || String(err);

      if (ke < maksPercobaan) {
        // Jeda menaik: Neon yang sedang bangun butuh waktu, dan mencoba lagi
        // seketika hanya akan gagal dengan alasan yang sama.
        const tunggu = jedaAwalMs * ke;
        console.warn(
          `[MIGRASI] Percobaan ke-${ke} gagal (${keadaan.galatTerakhir}). Mengulang dalam ${tunggu}ms...`
        );
        await jeda(tunggu);
        continue;
      }

      keadaan.status = "gagal";

      // console.error, bukan console.warn. Peringatan tenggelam di antara log
      // lain; inilah persisnya yang membuat kegagalan sebelumnya tidak
      // terlihat selama berjam-jam.
      console.error(
        `\n${"=".repeat(70)}\n` +
          `[MIGRASI] GAGAL setelah ${maksPercobaan} percobaan.\n` +
          `[MIGRASI] Penyebab: ${keadaan.galatTerakhir}\n` +
          `[MIGRASI] Server tetap menyala, TETAPI schema database mungkin\n` +
          `[MIGRASI] tertinggal. Fitur yang membutuhkan tabel baru akan gagal\n` +
          `[MIGRASI] dengan pesan yang tidak menyinggung migrasi sama sekali.\n` +
          `[MIGRASI] Periksa: npm run doctor  atau  GET /api/health\n` +
          `${"=".repeat(70)}\n`
      );
      return statusMigrasi();
    }
  }

  return statusMigrasi();
}
