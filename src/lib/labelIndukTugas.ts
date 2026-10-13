/**
 * Label sebuah tugas induk di pemilih dropdown (#727).
 *
 * KENAPA DI `.ts`, BUKAN DI KOMPONEN. Isinya komposisi DATA — kunci isu dan
 * judulnya — bukan kalimat antarmuka, jadi tidak ada yang perlu diterjemahkan
 * dan gerbang `sapu:teks` (yang memindai `.tsx`) memang bukan tempatnya.
 * Presedennya `features/flowchart/lib/tautanIsu.ts`: `labelTautanIsu`
 * melakukan pekerjaan yang sama untuk tautan dokumen.
 *
 * KENAPA KUNCI IKUT DI LABEL. Pencarian di `StyledDropdown` mencocokkan label,
 * jadi pemilik proyek yang mengetik "PRJ-73" harus menemukan tugasnya sama
 * seperti yang mengetik sebagian judulnya — perilaku yang dulu dimiliki
 * combobox inline dan tidak boleh hilang saat pensiun.
 */
export const labelIndukTugas = (tugas: {
  key?: string;
  taskKey?: string;
  type?: string;
  title?: string;
}): string =>
  `[${tugas.key || tugas.taskKey || (tugas.type ? tugas.type.toUpperCase() : "TASK")}] ${tugas.title || ""}`;
