/**
 * #759 — DAFTAR RIWAYAT INTERAKSI draw.io saat diagram DIBUAT.
 *
 * Ini penyebut angka "flow-nya harus sama dengan draw.io 90%" yang diminta
 * pemilik proyek 16 Okt. Kamus bentuk sudah diukur dan dikunci #755; angka itu
 * berkata berapa BANYAK bentuk yang bisa ditampilkan, bukan bagaimana RASanya
 * membuat diagram. Pertanyaan pemilik proyek justru tentang rasa itu, jadi ia
 * butuh penyebutnya sendiri — dan penyebut yang bisa diaudit, bukan angka yang
 * lahir dari perasaan sesi.
 *
 * SATU ATURAN YANG MEMBUAT BERKAS INI BERGUNA: tiap baris `ada: true` wajib
 * menyebut `penanda` — potongan kode yang HARUS benar-benar ada di berkas yang
 * disebut. `kartuAlirDrawio-759.test.tsx` membacanya dari disk dan menggagalkan
 * papan bila penandanya tidak ada. Karena itu tidak mungkin menulis `ada: true`
 * untuk sesuatu yang belum dikerjakan: klaimnya bisa dibuktikan atau dibantah
 * oleh perkakas, bukan oleh yang menulis daftar.
 *
 * Baris `ada: false` wajib menyebut `sebab`, dan kalau pekerjaannya sudah punya
 * nomor papan, `tiket`-nya. Itulah bedanya kerugian yang dinyatakan dan kerugian
 * yang disembunyikan — pelajaran #752, di mana peta yang salah tetap hijau
 * karena tidak ada yang memeriksa namanya terhadap kenyataan.
 *
 * CAKUPANNYA: interaksi saat satu diagram sedang DIGARAP di kanvas, plus jalan
 * keluar yang dipakai orang setelahnya (ekspor). Tidak termasuk isi pustaka
 * bentuk (itu #755) dan tidak termasuk perilaku di luar editor flowchart.
 */
export type BuktiAlir = { berkas: string; penanda: string };

export type BarisAlir = {
  id: string;
  label: string;
  ada: boolean;
  bukti?: BuktiAlir;
  sebab?: string;
  tiket?: string;
};

export const ALIR_DRAWIO: readonly BarisAlir[] = [
  // --- Memilih dan membatalkan --------------------------------------------
  {
    id: "pilih-klik",
    label: "Klik satu bentuk untuk memilihnya",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: "const handleNodeMouseDown",
    },
  },
  {
    id: "marquee",
    label: "Seret kotak seleksi pada kanvas kosong",
    ada: true,
    bukti: { berkas: "src/features/flowchart/FlowchartContainer.tsx", penanda: "setMarqueeBox" },
  },
  {
    id: "multi-select",
    label: "Shift/Ctrl/Cmd+menyeret atau +klik menambah bentuk ke seleksi",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: "if (e.shiftKey || e.ctrlKey || e.metaKey)",
    },
  },
  {
    id: "pilih-semua",
    label: "Ctrl/Cmd+A memilih seluruh isi papan",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: 'e.key.toLowerCase() === "a"',
    },
  },
  {
    id: "batal-escape",
    label: "Escape membatalkan sunting, seleksi, dan mode sambung",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: "setConnectSourceId(null)",
    },
  },

  // --- Menggeser pandangan -------------------------------------------------
  {
    id: "pan-papan",
    label: "Spasi-tahan, tombol tengah, atau perkakas tangan menggeser papan",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: 'const geserPapan = activeTool === "hand" || isSpacePressed || e.button === 1',
    },
  },
  {
    id: "zoom-roda",
    label: "Roda mouse / cubit memperbesar dan memperkecil",
    ada: true,
    bukti: {
      berkas: "src/hooks/useFlowchartCanvas.ts",
      penanda: "const handleWheel = (e: WheelEvent)",
    },
  },
  {
    id: "zoom-halus",
    label: "Tombol zoom bergerak halus, bukan melompat",
    ada: true,
    bukti: { berkas: "src/features/flowchart/FlowchartContainer.tsx", penanda: "geserZoomHalus" },
  },
  {
    id: "zoom-pas",
    label: "Pas ke layar membingkai ulang seluruh diagram",
    ada: true,
    bukti: { berkas: "src/features/flowchart/FlowchartContainer.tsx", penanda: "pasKeLayar" },
  },
  {
    id: "minimap",
    label: "Peta kecil menunjukkan posisi pandangan di papan besar",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/components/FlowchartMinimap.tsx",
      penanda: "FlowchartMinimap",
    },
  },

  // --- Menaruh bentuk ------------------------------------------------------
  {
    id: "palet-seret",
    label: "Bentuk diseret dari palet dan mendarat tepat di titik lepas",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: "MIME_BENTUK_PALET",
    },
  },
  {
    id: "palet-klik",
    label: "Klik palet menaruh bentuk di tengah tampilan, pada titik yang bisa ditebak",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: "const handleAddNewNode = (",
    },
  },
  {
    id: "tambah-di-titik",
    label: "Menu konteks kanvas menambah bentuk di titik klik",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: "handleAddNewNodeAtPosition",
    },
  },
  {
    id: "snap-grid",
    label: "Perlekatan kisi saat memindahkan dan mengubah ukuran",
    ada: true,
    bukti: { berkas: "src/features/flowchart/FlowchartContainer.tsx", penanda: "isSnapToGrid" },
  },

  // --- Memindahkan dan mengubah bentuk ------------------------------------
  {
    id: "seret-bentuk",
    label: "Seret badan bentuk memindahkannya",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: "setDraggingNodeId",
    },
  },
  {
    id: "seret-lewat-label",
    label: "Seret dari atas label tetap menggerakkan bentuknya",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/components/FlowchartNode.tsx",
      penanda: "isEditingLabel",
    },
  },
  {
    id: "resize-delapan",
    label: "Delapan gagang ukuran: empat sudut dan empat tepi",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/components/FlowchartNode.tsx",
      penanda: "GAGANG_UKURAN",
    },
  },
  {
    id: "resize-rasio",
    label: "Shift pada gagang sudut mengunci perbandingan",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: "const kunci = e.shiftKey && arah.length === 2",
    },
  },
  {
    id: "resize-grup",
    label: "Menyeret gagang kotak seleksi mengubah ukuran semua anggota sebanding",
    ada: true,
    bukti: { berkas: "src/features/flowchart/FlowchartContainer.tsx", penanda: "if (ubahGrup)" },
  },
  {
    id: "nudge",
    label: "Panah menggeser bentuk, Shift memperbesar langkahnya",
    ada: true,
    bukti: { berkas: "src/features/flowchart/FlowchartContainer.tsx", penanda: '"ArrowUp"' },
  },
  {
    id: "nudge-grup",
    label: "Panah menggeser SELURUH bentuk terpilih, bukan satu",
    ada: true,
    bukti: { berkas: "src/features/flowchart/FlowchartContainer.tsx", penanda: "idNudge" },
  },
  {
    id: "putar",
    label: "Gagang putar memutar bentuk dengan sudut bebas, Shift mengunci 15°",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: "const handleRotateMouseDown",
    },
  },

  // --- Label ---------------------------------------------------------------
  {
    id: "sunting-dobel",
    label: "Klik ganda membuka penyuntingan label",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/components/FlowchartNode.tsx",
      penanda: "onDoubleClick",
    },
  },
  {
    id: "sunting-pintasan",
    label: "F2, Enter, atau ketik langsung membuka penyuntingan dan mengganti isinya",
    ada: true,
    bukti: { berkas: "src/features/flowchart/FlowchartContainer.tsx", penanda: 'e.key === "F2"' },
  },
  {
    id: "sunting-selesai",
    label: "Enter menutup, Shift+Enter menambah baris, Escape membatalkan",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: "akhiriSuntingLabel",
    },
  },

  // --- Menyambung ----------------------------------------------------------
  {
    id: "sambung-port",
    label: "Port melayang saat hover/select memulai sambungan",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: "const handleConnectPortClick",
    },
  },
  {
    id: "sambung-batal",
    label: "Klik kosong membatalkan mode sambung",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: 'setActiveTool("select")',
    },
  },
  {
    id: "garis-tebukan",
    label: "Tekukan garis bisa ditambah dan diseret",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/components/FlowchartEdges.tsx",
      penanda: "titikTengahJalur",
    },
  },
  {
    id: "garis-rute",
    label: "Rute garis bisa dipilih: lurus, siku, lengkung",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/components/EdgeStyleBar.tsx",
      penanda: "const BENTUK",
    },
  },
  {
    id: "garis-goresan",
    label: "Gaya goresan garis: utuh, putus-putus, titik-titik",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/components/EdgeStyleBar.tsx",
      penanda: "const GORESAN",
    },
  },
  {
    id: "garis-mata-panah",
    label: "Kepala panah draw.io bisa DIPILIH dari bilah gaya garis",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/components/EdgeStyleBar.tsx",
      penanda: "tombol-mata-panah",
    },
  },
  {
    id: "garis-retarget",
    label: "Ujung garis bisa diseret lepas dan dipasang ke bentuk lain",
    ada: false,
    sebab:
      "Ujung garis menempel pada bentuknya dan tidak ada gagang untuk memindahkannya; satu-satunya jalan adalah menghapus garis lalu menyambung ulang.",
    tiket: "#12",
  },
  {
    id: "garis-menu",
    label: "Menu konteks pada garis",
    ada: false,
    sebab:
      "Yang ada hanya menu konteks kanvas dan menu konteks bentuk; garis mengandalkan bilah gaya yang melayang di tengahnya.",
    tiket: "#757",
  },

  // --- Menggandakan, menghapus, riwayat -----------------------------------
  {
    id: "duplikat",
    label: "Ctrl/Cmd+D menduplikasi bentuk terpilih",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: 'e.key.toLowerCase() === "d"',
    },
  },
  {
    id: "salin-tempel",
    label: "Ctrl/Cmd+C dan Ctrl/Cmd+V, termasuk tempel di titik kursor",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: "const komitTempel",
    },
  },
  {
    id: "potong",
    label: "Ctrl/Cmd+X memotong bentuk dan garis yang menyentuhnya",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: "const potongSeleksi",
    },
  },
  {
    id: "hapus",
    label: "Delete / Backspace menghapus yang terpilih",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: "const handleDeleteSelected",
    },
  },
  {
    id: "undo-redo",
    label: "Ctrl/Cmd+Z dan Ctrl/Cmd+Y",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: "const handleUndoClick",
    },
  },
  {
    id: "riwayat-label",
    label: "Sunting label dan panel properti ikut tercatat di riwayat",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: "recordHistory(updated, edges)",
    },
  },
  {
    id: "grup",
    label: "Ctrl/Cmd+G mengumpulkan bentuk jadi satu grup yang bisa dipindah bersama",
    ada: false,
    sebab:
      "Seleksi jamak sudah pindah dan berubah ukuran bersama, tetapi tidak ada grup permanen yang bisa dipilih sekali lalu diperlakukan sebagai satu benda.",
    tiket: "#12",
  },
  {
    id: "tata-layers",
    label: "Bawa ke depan / naik / turun / kirim ke belakang",
    ada: true,
    bukti: { berkas: "src/features/flowchart/FlowchartContainer.tsx", penanda: "ubahTataLayers" },
  },

  // --- Gaya bentuk ---------------------------------------------------------
  {
    id: "warna-bentuk",
    label: "Warna bentuk dipilih dari satu sumber palet",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/components/NodeContextMenu.tsx",
      penanda: "colorPaletteHex",
    },
  },
  {
    id: "panel-properti",
    label: "Panel properti bentuk muncul di semua lebar layar, termasuk HP",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/components/NodePropertiesOverlay.tsx",
      penanda: "bottom-full mb-2",
    },
  },
  {
    id: "panduan-rapi",
    label: "Garis bantu perataan muncul saat bentuk disejajarkan",
    ada: false,
    sebab: "Tidak ada panduan perataan; perataan hanya sedekat yang diberikan kisi.",
    tiket: "#628",
  },

  // --- Menu ----------------------------------------------------------------
  {
    id: "menu-bentuk",
    label: "Menu konteks pada bentuk",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/components/NodeContextMenu.tsx",
      penanda: "NodeContextMenu",
    },
  },
  {
    id: "menu-kanvas",
    label: "Menu konteks pada kanvas kosong",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/components/CanvasContextMenu.tsx",
      penanda: "CanvasContextMenu",
    },
  },

  // --- Keluar --------------------------------------------------------------
  {
    id: "ekspor-drawio",
    label: "Papan bisa ditulis menjadi berkas .drawio",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/lib/eksporDrawio.ts",
      penanda: "export const eksporDrawIo",
    },
  },
  {
    id: "ekspor-jpg",
    label: "Papan bisa dipotret menjadi JPG",
    ada: true,
    bukti: { berkas: "src/features/flowchart/FlowchartContainer.tsx", penanda: "handleExportJPG" },
  },
  {
    id: "ekspor-png-svg",
    label: "Papan bisa diekspor PNG dan SVG",
    ada: true,
    bukti: {
      berkas: "src/features/flowchart/FlowchartContainer.tsx",
      penanda: 'const eksporGambar = async (format: "jpg" | "png" | "svg")',
    },
  },
  {
    id: "halaman-ganda",
    label: "Satu dokumen berisi beberapa halaman diagram",
    ada: false,
    sebab:
      "Satu papan = satu kanvas; berkas draw.io multi-halaman hanya bisa memakai halaman pertamanya.",
    tiket: "#11",
  },
];

/** Yang terbukti ada di kode. Hanya dipakai `skorAlir` di bawah. */
const alirTerpenuhi = (daftar: readonly BarisAlir[]): BarisAlir[] => daftar.filter((b) => b.ada);

/** Persentase interaksi draw.io yang benar-benar tersedia di papan ini. */
export const skorAlir = (daftar: readonly BarisAlir[] = ALIR_DRAWIO): number =>
  (alirTerpenuhi(daftar).length / daftar.length) * 100;
