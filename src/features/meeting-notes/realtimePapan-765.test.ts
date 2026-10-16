/**
 * #765 putaran 2 — papan harus berubah sendiri ketika isinya berubah.
 *
 * Permintaan pemilik proyek 16 Okt: "data di table harus realtime tanpa harus
 * load jika ada perubahan data". Yang terukur sebelum menambal: papan membuka
 * socketnya sendiri (`io()`) tetapi TIDAK PERNAH masuk ke ruangan proyek, sementara
 * server mengirim `data_changed` KE RUANGAN ITU (`io.to(projectId)`) setiap kali
 * `projectId` bisa dibaca dari URL — dan setiap jalur titik diskusi membawanya.
 * Jadi pendengar papan hanya pernah menangkap varian global: perubahan orang lain
 * baru muncul sesudah halaman dimuat ulang.
 *
 * Membaca sumber, bukan merender: yang dikunci di sini adalah SATU HUBUNGAN antar
 * berkas (siapa mengirim ke ruangan mana, dan siapa masuk ruangan itu) — dan dua
 * pagar perilaku yang kalau hilang membuat perbaikannya jadi lebih buruk dari
 * bugnya: efek tidak boleh bergantung pada identitas fungsi muat ulang (kalau
 * iya, socketnya putus-sambung setiap render — kelas cacat yang baru ditutup
 * #711), dan papan tidak boleh lagi membuka socket keduanya sendiri.
 */
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

const REALTIME = "src/features/meeting-notes/lib/realtime.ts";
const TABEL = "src/features/meeting-notes/DiscussionPointsTable.tsx";
const SERVER = "server.ts";

describe("#765 — papan masuk ruangan proyek tempat peristiwa dikirim", () => {
  it("server mengirim `data_changed` ke ruangan proyek, bukan ke seluruh dunia", () => {
    const isi = baca(SERVER);
    expect(isi).toContain('io.to(projectId).emit("data_changed"');
  });

  it("hook papan menggabungkan ruangan itu sebelum memasang pendengar", () => {
    const isi = baca(REALTIME);
    expect(isi).toContain('socket.emit("join_project", { projectId })');
    expect(isi).toContain('socket.on("data_changed"');
    // Tanpa identitas pengguna: `join_project` mencatat kehadiran HANYA bila
    // socketnya punya identitas, dan socket papan tidak punya. Karena itu papan
    // juga tidak boleh mengirim apa pun yang menyentuh daftar kehadiran.
    expect(isi).not.toContain('join_project", { projectId, user');
    expect(isi).not.toContain('socket.emit("leave');
  });

  it("efeknya tidak bergantung pada fungsi muat ulang (kalau iya: reconnect setiap render)", () => {
    const isi = baca(REALTIME);
    expect(isi).toContain("rujukMuat.current = muatUlang");
    expect(isi).toContain("}, [projectId]);");
    expect(isi).not.toMatch(/\[projectId, muatUlang\]/);
  });

  it("papan tidak membuka socket keduanya lagi, dan tidak menaruh pendengar di dua tempat", () => {
    const isi = baca(TABEL);
    expect(isi).not.toContain('io("');
    expect(isi).not.toContain("socket.io-client");
    expect(isi).not.toContain('socket.on("data_changed"');
    expect(isi).toContain("useRealtimePapan({ projectId, muatUlang: () => void fetchPoints() })");
  });

  it("gema dari aksi sendiri tetap dibekukan 8 detik seperti mutasi papan lainnya", () => {
    expect(baca(REALTIME)).toContain("shouldSuppressDiscussionPointsRefresh()");
    expect(baca("src/features/meeting-notes/lib/selesaiCatatan.ts")).toContain(
      "suppressDiscussionPointsRefresh(8000)"
    );
  });
});
