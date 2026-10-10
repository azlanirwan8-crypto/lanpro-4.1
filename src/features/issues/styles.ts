/**
 * Gaya Daftar Isu — #340: mode gelap via token saja (§22), tanpa override manual.
 */
export const styles = {
  container:
    "flex flex-col bg-surface rounded-lg border border-border-subtle/80 shadow-xs font-sans relative flex-1 min-h-[500px] overflow-hidden",
  // #363 — kontrol utama (search/filter/config) 1 baris di HP; pill aktif di baris bawah.
  toolbar:
    "flex flex-col gap-2 px-3 sm:px-4 py-3 border-b border-border-subtle/80 bg-surface-sunken/50 shrink-0",
  searchWrapper: "relative group min-w-0 flex-1 sm:flex-none",
  searchInput:
    "pl-9 pr-3 sm:pr-4 py-2 bg-surface border border-border-subtle rounded-md text-xs font-normal text-content-body w-full sm:w-64 min-w-0 placeholder:font-normal placeholder:text-content-subtle focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-2xs",
  filterPill:
    "px-2.5 py-1 bg-primary/10 text-primary border border-primary/30 rounded-md text-[10px] font-normal tracking-tight shadow-2xs",
  filterPillAmber:
    "px-2.5 py-1 bg-warning/10 text-warning-text border border-warning/30 rounded-md text-[10px] font-normal tracking-tight shadow-2xs",
  tableWrapper:
    "overflow-auto w-full custom-scrollbar relative flex-1 min-h-0 max-h-[calc(100vh-220px)]",
  table: "w-full text-left border-collapse flex-none",
  // #606 — kepala ini `sticky`, jadi latarnya WAJIB tertutup. `bg-primary-surface/5`
  // terukur `oklab(... / 0.05)`: baris yang lewat di bawahnya terlihat tembus dan
  // teksnya bertumpuk (laporan pemilik proyek 03 Okt: "lihat header nya tabrakan
  // dengan isi data"). `bg-surface-sunken` adalah token yang sama yang sudah dipakai
  // sel reorder di kepala yang sama — selama ini hanya kolom itu yang tidak tembus.
  // `z-30` di atas `z-20` milik sel baris tambah, supaya tidak ada sel baris yang
  // bisa menggambar di atas kepala.
  // #678b — tepi kepala dan pemisah kolom pindah ke TOKEN garis. `border-primary/15`
  // dan `/10` hanya 1,22:1 dan 1,13:1 di mode gelap, sehingga kepala tabel tidak
  // lagi terpisah dari isinya; di mode terang perubahan nyaris nol (#e3edf2 ->
  // #e2e8f0). Pemisah kolom ikut ke garis pemisah karena ia hiasan, bukan batas
  // kontrol: garis setajam garis kontrol di setiap kolom akan mengubah tabel
  // menjadi kisi.
  tableHeader: "bg-surface-sunken border-b border-border-subtle sticky top-0 z-30 shadow-2xs",
  tableHeaderCell:
    "group relative px-4 py-2.5 text-[10px] font-normal text-content-subtle whitespace-nowrap border-r border-border-faint",
  tableRow:
    "group hover:bg-surface-sunken/70 transition-all duration-150 cursor-default border-b border-border-faint",
  selectedTableRow: "bg-primary-surface/5",
  inlineAddRow: "bg-surface group/inline-add relative overflow-visible",
  // #486 — tanpa border-y-2 border-primary (terlalu tebal); cukup pemisah kolom tipis
  inlineAddBorderedCell: "p-0 border-r border-border-faint relative",
  inlineAddInput:
    "w-full bg-transparent border-none text-xs font-normal text-content-strong placeholder:text-content-subtle focus:ring-0 outline-none",
};
