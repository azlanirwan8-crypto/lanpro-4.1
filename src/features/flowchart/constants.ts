/**
 * Konstanta Flowchart.
 *
 * Diekstrak apa adanya dari FlowchartContainer.tsx (Fase 3 — Anti-God-Object).
 */
import type { FlowNodeType } from "./types";

/**
 * #620 — bentuk yang ditawarkan palet DAN bentuk yang bisa disimpan ke payload
 * papan kini satu sumber: entri tanpa tipe yang dikenal menolak dikompilasi,
 * bukan lagi lolos lewat `as FlowNode["type"]` di panel.
 */
export interface EntriBentukPalet {
  type: FlowNodeType;
  name: string;
  desc: string;
}

export interface GrupBentukPalet {
  title: string;
  items: EntriBentukPalet[];
}

/**
 * Palet HEX bentuk - SATU-SATUNYA sumber warna bentuk di papan.
 *
 * Riangnya terukur, dan #638 mengubahnya karena keluhan, bukan selera:
 * - #627 menaikkan isian ke tingkat 100/200 dengan tepi 600/700 karena bentuk
 *   terlihat pudar. Yang tidak dihitung waktu itu: kontras tepi/isian jadi
 *   rata-rata 5,71, dan bentuk berubah jadi stiker tebal - dilaporkan lagi
 *   05 Okt ("masih gemuk dan warnanya tidak bagus, pecah").
 * - #638 memakai resep draw.io: isian pastel RATA satu tone, tepi sewarna
 *   keluarga tetapi lunak. Kontras tepi/isian jadi 1,76-3,36 (rata 2,91),
 *   bandang draw.io sendiri 1,76-3,32 (rata 2,83); `slate` 5,27 karena
 *   #f5f5f5/#666666 memang pasangan abu-abu kanonik mereka. Kontras teks
 *   #1e293b di atas isian tetap 10,1-13,4 - melunakkan bentuk tidak
 *   mengorbankan keterbacaan label.
 * - Sembilan pasangan diambil apa adanya dari palet kanonik draw.io. `amber`,
 *   `indigo`, dan `purple` tidak ada padanannya di daftar itu, jadi diturunkan
 *   dengan resep yang sama (isian S 45-70 L 89-91, tepi S 30-45 L 48-58) agar
 *   tetap berbeda dari tetangganya.
 *
 * `bgGrad` sengaja disamakan dengan `bg`: isian tidak lagi bergradien 135
 * derajat. Kolomnya dipertahankan karena `warnaPaletTerdekat` (penjeraf
 * draw.io/Miro) memetakan hex asal ke NAMA warna lewat bacaan `bgGrad`+`stroke`.
 */
export const colorPaletteHex: Record<string, { bg: string; bgGrad: string; stroke: string }> = {
  yellow: { bg: "#fff2cc", bgGrad: "#fff2cc", stroke: "#d6b656" }, // draw.io yellow
  orange: { bg: "#ffe6cc", bgGrad: "#ffe6cc", stroke: "#d79b00" }, // draw.io orange
  pink: { bg: "#e6d0de", bgGrad: "#e6d0de", stroke: "#996185" }, // draw.io mauve
  blue: { bg: "#dae8fc", bgGrad: "#dae8fc", stroke: "#6c8ebf" }, // draw.io blue
  green: { bg: "#d5e8d4", bgGrad: "#d5e8d4", stroke: "#82b366" }, // draw.io green
  purple: { bg: "#e1d5e7", bgGrad: "#e1d5e7", stroke: "#9673a6" }, // draw.io purple
  indigo: { bg: "#dfdbf5", bgGrad: "#dfdbf5", stroke: "#7c74b4" }, // resep draw.io, hue 248
  sky: { bg: "#b0e3e6", bgGrad: "#b0e3e6", stroke: "#0e8088" }, // draw.io cyan
  amber: { bg: "#f7e9cf", bgGrad: "#f7e9cf", stroke: "#b18d43" }, // resep draw.io, hue 40
  rose: { bg: "#f8cecc", bgGrad: "#f8cecc", stroke: "#b85450" }, // draw.io red
  violet: { bg: "#f0d7f4", bgGrad: "#f0d7f4", stroke: "#a970b2" }, // resep draw.io, hue 292
  slate: { bg: "#f5f5f5", bgGrad: "#f5f5f5", stroke: "#666666" }, // draw.io grey
};

/**
 * Kelas TEKS bentuk non-SVG, per nama warna.
 *
 * Dulu struktur ini memegang kelas latar DAN tepi (`bg-amber-100
 * border-amber-600`) di samping `colorPaletteHex`. Sejak #638 keduanya tidak
 * di sini lagi: latar dan garis tepi bentuk dibaca dari `colorPaletteHex` di
 * atas lalu dipasang inline, supaya bentuk div, bentuk SVG, dan petak pemilih
 * warna tidak bisa berbeda warna - sebab yang sama dengan #631 untuk ukuran
 * bentuk. Yang tersisa hanya warna teks, dan itu memang kosakata kelas.
 *
 * `slate` dulu satu-satunya yang memakai token tema (`text-content-strong`), dan
 * itu cacat yang tercatat: isian bentuk adalah DATA dan tetap #f5f5f5 di kedua
 * mode, sementara token teks membalik jadi terang di mode gelap — label slate
 * akhirnya 1,01:1 di atas isian sendiri. #677 memindahkannya ke
 * `text-content-kanvas`, token `content-*` yang nilainya SENGAJA sama di terang
 * dan gelap (pola yang sama dengan `content-inverse`, `index.css:84-92`), supaya
 * tetap kosakata teks dan `audit:warna` tidak bertambah pemakai kelas keras.
 * Penjaganya: `components/FlowchartNode.labelGelap-677.test.tsx`.
 */
export const colorPalettes: Record<string, { text: string }> = {
  yellow: { text: "text-amber-900" },
  orange: { text: "text-orange-900" },
  pink: { text: "text-pink-900" },
  blue: { text: "text-blue-900" },
  green: { text: "text-emerald-900" },
  purple: { text: "text-purple-900" },
  indigo: { text: "text-indigo-900" },
  sky: { text: "text-sky-900" },
  amber: { text: "text-amber-900" },
  rose: { text: "text-rose-900" },
  violet: { text: "text-violet-900" },
  slate: { text: "text-content-kanvas" },
};

/** Kelompok bentuk yang tampil di panel pemilih diagram. Data murni. */
/**
 * Ukuran lahir tiap bentuk baru (#541).
 *
 * `handleAddNewNode` hanya punya kasus untuk sebagian tipe; sisanya lahir sebagai
 * kotak 140×70, sehingga lingkaran jadi telur dan panah jadi papan. Peta ini
 * dibaca SEBELUM switch, jadi kasus yang sudah ada tetap menang.
 */
export const UKURAN_BENTUK: Record<string, { width: number; height: number; fontSize?: number }> = {
  heptagon: { width: 110, height: 110 },
  nonagon: { width: 110, height: 110 },
  ring: { width: 110, height: 110 },
  semicircleUp: { width: 110, height: 110 },
  semicircleDown: { width: 110, height: 110 },
  quarterDisc: { width: 110, height: 110 },
  chord: { width: 110, height: 110 },
  pieSlice: { width: 110, height: 110 },
  lens: { width: 110, height: 110 },
  star4: { width: 110, height: 110 },
  hexagram: { width: 110, height: 110 },
  connectorSmall: { width: 110, height: 110 },
  umlInitial: { width: 110, height: 110 },
  umlActivityFinal: { width: 110, height: 110 },
  stamp: { width: 110, height: 110 },
  sphere: { width: 110, height: 110 },
  cube: { width: 110, height: 110 },
  cone: { width: 110, height: 110 },
  lShape: { width: 110, height: 110 },
  tShape: { width: 110, height: 110 },
  cdnEdge: { width: 110, height: 110 },
  dns: { width: 110, height: 110 },
  internet: { width: 110, height: 110 },
  loadBalancer: { width: 110, height: 110 },
  lock: { width: 110, height: 110 },
  server: { width: 110, height: 110 },
  container: { width: 110, height: 110 },
  apiGateway: { width: 110, height: 110 },
  bpmnTimerEvent: { width: 110, height: 110 },
  bpmnMessageEvent: { width: 110, height: 110 },
  bpmnErrorEvent: { width: 110, height: 110 },
  bpmnSignalEvent: { width: 110, height: 110 },
  bpmnConditionalEvent: { width: 110, height: 110 },
  bpmnAndGateway: { width: 110, height: 110 },
  bpmnXorGateway: { width: 110, height: 110 },
  person: { width: 110, height: 110 },
  team: { width: 110, height: 110 },
  printer: { width: 110, height: 110 },
  laptop: { width: 110, height: 110 },
  bpmnTask: { width: 165, height: 80 },
  bpmnUserTask: { width: 165, height: 80 },
  bpmnServiceTask: { width: 165, height: 80 },
  bpmnScriptTask: { width: 165, height: 80 },
  bpmnBusinessRuleTask: { width: 165, height: 80 },
  bpmnSendTask: { width: 165, height: 80 },
  bpmnReceiveTask: { width: 165, height: 80 },
  bubbleRound: { width: 170, height: 105 },
  bubbleTailLeft: { width: 170, height: 105 },
  bubbleTailRight: { width: 170, height: 105 },
  bubbleTailUp: { width: 170, height: 105 },
  tag: { width: 170, height: 105 },
  banner: { width: 170, height: 105 },
  cloudCallout: { width: 170, height: 105 },
  speechDouble: { width: 170, height: 105 },
  bpmnPool: { width: 260, height: 150 },
  bracketLeft: { width: 56, height: 130 },
  bracketRight: { width: 56, height: 130 },
  braceLeft: { width: 56, height: 130 },
  braceRight: { width: 56, height: 130 },
  annotationLeft: { width: 56, height: 130 },
  annotationRight: { width: 56, height: 130 },
  arrowUp: { width: 90, height: 130 },
  arrowDown: { width: 90, height: 130 },
  arrowUpDown: { width: 90, height: 150 },
  mobile: { width: 76, height: 130 },
  rack: { width: 96, height: 130 },
  umlGeneralization: { width: 90, height: 140 },
  badge: { width: 110, height: 130 },
  noteCorner: { width: 120, height: 120 },
  curvedArrow: { width: 150, height: 90 },
  homePlate: { width: 160, height: 80 },
  arrowCallout: { width: 175, height: 85 },
  extract: { width: 120, height: 110 },
  offPage: { width: 140, height: 90 },
  loopLimit: { width: 140, height: 90 },
  storage: { width: 150, height: 100 },
  punchCard: { width: 140, height: 100 },
  parallelMode: { width: 120, height: 110 },
  sequentialData: { width: 160, height: 90 },
  compare: { width: 120, height: 110 },
  draftDocument: { width: 150, height: 100 },
  umlPackage: { width: 160, height: 120 },
  umlComponent: { width: 160, height: 100 },
  umlObject: { width: 160, height: 90 },
  umlSwimlane: { width: 220, height: 150 },
  umlDependency: { width: 170, height: 60 },
  queue: { width: 170, height: 80 },
  key: { width: 130, height: 90 },
  wifi: { width: 130, height: 110 },
  firewall: { width: 150, height: 90 },

  /* #549 — keluarga diagram standar baru. Proporsinya ikut bentuk aslinya:
     komponen listrik memanjang, gerbang logika hampir persegi, lane melebar. */
  erEntity: { width: 180, height: 120 },
  erWeakEntity: { width: 180, height: 120 },
  erAttribute: { width: 160, height: 110 },
  erKeyAttribute: { width: 165, height: 120 },
  erDerivedAttribute: { width: 160, height: 110 },
  erMultiValued: { width: 170, height: 125 },
  erRelationship: { width: 150, height: 150 },
  erCrowsFoot: { width: 190, height: 80 },
  gateAnd: { width: 140, height: 100 },
  gateOr: { width: 140, height: 100 },
  gateNot: { width: 140, height: 100 },
  gateNand: { width: 140, height: 100 },
  gateNor: { width: 140, height: 100 },
  gateXor: { width: 140, height: 100 },
  gateMux: { width: 110, height: 145 },
  gateFlipFlop: { width: 130, height: 115 },
  laneHorizontal: { width: 320, height: 170 },
  laneVertical: { width: 200, height: 300 },
  poolLane: { width: 340, height: 190 },
  vsmProcess: { width: 150, height: 130 },
  vsmData: { width: 140, height: 120 },
  vsmInventory: { width: 140, height: 120 },
  vsmWait: { width: 150, height: 115 },
  vsmKanbanPillar: { width: 100, height: 150 },
  uiBrowser: { width: 280, height: 180 },
  uiMobile: { width: 96, height: 175 },
  uiButton: { width: 150, height: 62 },
  uiInput: { width: 200, height: 66 },
  uiCheckbox: { width: 110, height: 110 },
  uiRadio: { width: 110, height: 110 },
  uiDropdown: { width: 200, height: 66 },
  uiImagePlaceholder: { width: 150, height: 140 },
  netRouter: { width: 130, height: 130 },
  netSwitch: { width: 200, height: 110 },
  netHub: { width: 130, height: 130 },
  netFirewall: { width: 150, height: 140 },
  netWirelessAp: { width: 140, height: 150 },
  netStorage: { width: 150, height: 125 },
  netSubnet: { width: 280, height: 180 },
  netClient: { width: 160, height: 130 },
  elResistor: { width: 200, height: 60 },
  elCapacitor: { width: 200, height: 60 },
  elInductor: { width: 200, height: 60 },
  elGround: { width: 110, height: 130 },
  elLamp: { width: 110, height: 110 },
  elMotor: { width: 110, height: 110 },
  pidValve: { width: 150, height: 110 },
  pidPump: { width: 130, height: 120 },
};
export const DIAGRAM_SHAPE_GROUPS: GrupBentukPalet[] = [
  {
    title: "Basic Shapes",
    items: [
      { type: "rect", name: "Rectangle", desc: "Langkah Kerja" },
      { type: "oval", name: "Oval Bounds", desc: "Mulai / Selesai" },
      { type: "circle", name: "Circle Group", desc: "Kategori Bulat" },
      { type: "triangle", name: "Triangle", desc: "Merge / Extract" },
      { type: "pentagon", name: "Pentagon Step", desc: "Segi Lima" },
      { type: "hexagon", name: "Hexagon Prep", desc: "Segi Enam" },
      { type: "octagon", name: "Octagon Stop", desc: "Segi Delapan" },
      { type: "star", name: "Spotlight Star", desc: "Sorotan Utama" },
      { type: "cross", name: "Cross / Plus", desc: "Summing Junction" },
      { type: "trapezoid", name: "Trapezoid", desc: "Manual Input" },
      { type: "heptagon", name: "Heptagon", desc: "Segi Tujuh" },
      { type: "nonagon", name: "Nonagon", desc: "Segi Sembilan" },
      { type: "ring", name: "Ring / Donut", desc: "Cincin Konsentris" },
      { type: "semicircleUp", name: "Semicircle Up", desc: "Setengah Lingkaran" },
      { type: "semicircleDown", name: "Semicircle Down", desc: "Mangkuk / Tandon" },
      { type: "quarterDisc", name: "Quarter Circle", desc: "Seperempat Lingkaran" },
      { type: "chord", name: "Chord Segment", desc: "Tali Busur Lingkaran" },
      { type: "pieSlice", name: "Pie Sector", desc: "Irisan Lingkaran" },
      { type: "lens", name: "Lens Shape", desc: "Perpotongan Dua Busur" },
      { type: "cube", name: "Cube 3D", desc: "Balok Isometrik" },
      { type: "cone", name: "Cone", desc: "Kerucut" },
      { type: "sphere", name: "Sphere", desc: "Bola Berjaring" },
      { type: "lShape", name: "L Block", desc: "Susut Sudut Kanan" },
      { type: "tShape", name: "T Block", desc: "Cabang Tiga" },
      { type: "star4", name: "Star Four Point", desc: "Bintang Empat" },
      { type: "hexagram", name: "Hexagram", desc: "Bintang Enam" },
      { type: "bracketLeft", name: "Bracket Left", desc: "Kurung Siku Buka" },
      { type: "bracketRight", name: "Bracket Right", desc: "Kurung Siku Tutup" },
      { type: "braceLeft", name: "Brace Left", desc: "Kurung Akolade" },
      { type: "braceRight", name: "Brace Right", desc: "Kurung Akolade Balik" },
    ],
  },
  {
    title: "Flowchart",
    items: [
      { type: "diamond", name: "Decision Diamond", desc: "Cabang Keputusan" },
      { type: "database", name: "DB Server Table", desc: "Database SQL/NoSQL" },
      { type: "cylinder", name: "Cylinder Storage", desc: "System File/Data" },
      { type: "subprocess", name: "Subprocess Block", desc: "Fungsi Predefined" },
      { type: "document", name: "File Document", desc: "Laporan / Hasil" },
      { type: "multiDocument", name: "Multi-Document", desc: "Stacked Wave Pages" },
      { type: "manualInput", name: "Manual Input", desc: "Form & Manual Data" },
      { type: "manualOperation", name: "Manual Operation", desc: "Manual Intervention" },
      { type: "preparation", name: "Preparation Hex", desc: "Setup & Initialization" },
      { type: "display", name: "Display Screen", desc: "Sistem Informasikan" },
      { type: "summingJunction", name: "Summing Junction", desc: "Circle with Cross" },
      { type: "collate", name: "Collate Step", desc: "Organize Records" },
      { type: "connectorOr", name: "OR Junction", desc: "Alternative Logic Node" },
      { type: "sort", name: "Sort Record", desc: "Arrange Sequence" },
      { type: "merge", name: "Merge Branch", desc: "Combine Data Streams" },
      { type: "folder", name: "Folder Storage", desc: "Penyimpanan Berkas" },
      { type: "cloud", name: "Cloud Architecture", desc: "Infrastruktur Cloud" },
      { type: "card", name: "Backlog Epic Card", desc: "Story Board Task" },
      { type: "predefined", name: "Predefined Process", desc: "Double Border" },
      { type: "parallelogram", name: "Data Parallelogram", desc: "Input / Output" },
      { type: "extract", name: "Extract", desc: "Jam Pasir Pemisah" },
      { type: "offPage", name: "Off-Page Reference", desc: "Lanjut Halaman Lain" },
      { type: "connectorSmall", name: "Connector", desc: "Bulat Penghubung" },
      { type: "loopLimit", name: "Loop Limit", desc: "Batas Perulangan" },
      { type: "storage", name: "Storage Drum", desc: "Gudang Data" },
      { type: "annotationLeft", name: "Annotation Left", desc: "Catatan Kiri" },
      { type: "annotationRight", name: "Annotation Right", desc: "Catatan Kanan" },
      { type: "punchCard", name: "Punch Card", desc: "Kartu Berlubang" },
      { type: "parallelMode", name: "Parallel Mode", desc: "Jalur Bersamaan" },
      { type: "sequentialData", name: "Sequential Data", desc: "Pita Berurutan" },
      { type: "compare", name: "Compare", desc: "Uji Dua Masukan" },
      { type: "draftDocument", name: "Draft Document", desc: "Dokumen Bergelombang" },
    ],
  },
  {
    title: "Callouts",
    items: [
      { type: "callout", name: "Callout Speech", desc: "Anotasi / Komentar" },
      { type: "delay", name: "Delay Step", desc: "Sistem Menunggu" },
      { type: "arrowRight", name: "Arrow Right", desc: "Menunjuk Kanan" },
      { type: "arrowLeft", name: "Arrow Left", desc: "Menunjuk Kiri" },
      { type: "arrowLeftRight", name: "Arrow Left Right", desc: "Dua Arah Hub" },
      { type: "chevron", name: "Chevron Process", desc: "Langkah Beruntun" },
      { type: "curlyLeft", name: "Curly Left", desc: "Grup Awal" },
      { type: "curlyRight", name: "Curly Right", desc: "Grup Akhir" },
      { type: "bubbleRound", name: "Speech Bubble", desc: "Balon Kata Bulat" },
      { type: "bubbleTailLeft", name: "Bubble Tail Left", desc: "Ekor Kiri Bawah" },
      { type: "bubbleTailRight", name: "Bubble Tail Right", desc: "Ekor Kanan Bawah" },
      { type: "bubbleTailUp", name: "Bubble Tail Up", desc: "Ekor Menunjuk Atas" },
      { type: "tag", name: "Tag Label", desc: "Label Berlubang" },
      { type: "badge", name: "Award Badge", desc: "Lencana Berpita" },
      { type: "banner", name: "Banner Ribbon", desc: "Pita Lebar" },
      { type: "stamp", name: "Stamp Frame", desc: "Bingkai Perangko" },
      { type: "noteCorner", name: "Note Fold", desc: "Catatan Lipat Sudut" },
      { type: "cloudCallout", name: "Cloud Callout", desc: "Awan Berbicara" },
      { type: "speechDouble", name: "Speech Double", desc: "Dua Ekor Obrolan" },
    ],
  },
  {
    title: "My Shapes",
    items: [
      { type: "sticky", name: "Sticky Notes", desc: "Miro Post-It" },
      { type: "actor", name: "System Actor", desc: "Aktor Pengguna" },
    ],
  },
  {
    title: "AWS Active Cloud",
    items: [
      { type: "awsLambda", name: "AWS Lambda", desc: "Serverless Function" },
      { type: "awsEc2", name: "AWS EC2", desc: "Virtual Server Node" },
      { type: "awsS3", name: "AWS S3 Bucket", desc: "Object Storage" },
      { type: "awsVpc", name: "AWS VPC", desc: "Virtual Network Area" },
      { type: "awsRds", name: "AWS RDS", desc: "Relational DB Cluster" },
      { type: "awsCloudwatch", name: "AWS CloudWatch", desc: "Monitoring & Stats" },
      { type: "awsDynamo", name: "AWS DynamoDB", desc: "NoSQL Database Table" },
    ],
  },
  {
    title: "Azure Cloud",
    items: [
      { type: "azureUser", name: "Azure Account", desc: "User Directory Profiling" },
      { type: "azureSql", name: "Azure SQL DB", desc: "Relational Cloud DB" },
      { type: "azureFunctions", name: "Azure Functions", desc: "Serverless Computing" },
      { type: "azureKeyVault", name: "Azure Key Vault", desc: "Secrets Key/Vault" },
      { type: "azureCosmos", name: "Cosmos NoSQL", desc: "Distributed Database" },
      { type: "azurePowerBi", name: "PowerBI Report", desc: "Data Analytics Insights" },
      { type: "azureVm", name: "Azure VM Node", desc: "Classic Computes Server" },
      { type: "azureStorage", name: "Azure Storage", desc: "File and Blob Cloud Storage" },
    ],
  },
  {
    title: "UML Modeling",
    items: [
      { type: "umlClass", name: "UML Class", desc: "Class Structure model" },
      { type: "umlInterface", name: "UML Interface", desc: "Interface & Lollipop" },
      { type: "umlUseCase", name: "UML Use Case", desc: "Business Use Case" },
      { type: "umlBoundary", name: "UML Boundary", desc: "Boundary Interface" },
      { type: "umlControl", name: "UML Control", desc: "Controller Logic Node" },
      { type: "umlEntity", name: "UML Entity", desc: "Database Entity Model" },
      { type: "umlNote", name: "UML Note Page", desc: "UML Dog-Ear Comment" },
      { type: "umlPackage", name: "UML Package", desc: "Kotak Berlabel" },
      { type: "umlComponent", name: "UML Component", desc: "Komponen Berpfokus" },
      { type: "umlObject", name: "UML Object", desc: "Instansi Bergaris Bawah" },
      { type: "umlInitial", name: "UML Initial Node", desc: "Titik Mulai Penuh" },
      { type: "umlActivityFinal", name: "UML Activity Final", desc: "Lingkaran Berinti" },
      { type: "umlDependency", name: "UML Dependency", desc: "Panah Putus-Putus" },
      { type: "umlGeneralization", name: "UML Generalization", desc: "Warisan Segitiga" },
      { type: "umlSwimlane", name: "UML Swimlane", desc: "Kolom Aktor" },
    ],
  },
  {
    title: "BPMN Diagram",
    items: [
      { type: "bpmnActivity", name: "BPMN Activity", desc: "Enterprise Work Task" },
      { type: "bpmnEvent", name: "Start Event", desc: "Process Launch Point" },
      { type: "bpmnGateway", name: "Flow Gateway", desc: "Logical Split / Merge" },
      { type: "bpmnDataStore", name: "BPMN Storage", desc: "System Datastore" },
      { type: "bpmnDataObject", name: "Data Object Page", desc: "BPMN File Artifact" },
      { type: "bpmnEventEnd", name: "End Event Terminal", desc: "Process Terminus Point" },
      { type: "bpmnTask", name: "BPMN Task", desc: "Tugas Umum" },
      { type: "bpmnUserTask", name: "User Task", desc: "Tugas Melibatkan Orang" },
      { type: "bpmnServiceTask", name: "Service Task", desc: "Tugas Otomatis" },
      { type: "bpmnScriptTask", name: "Script Task", desc: "Tugas Skrip" },
      { type: "bpmnBusinessRuleTask", name: "Business Rule Task", desc: "Tugas Aturan Bisnis" },
      { type: "bpmnSendTask", name: "Send Task", desc: "Kirim Pesan" },
      { type: "bpmnReceiveTask", name: "Receive Task", desc: "Terima Pesan" },
      { type: "bpmnTimerEvent", name: "Timer Event", desc: "Event Waktu" },
      { type: "bpmnMessageEvent", name: "Message Event", desc: "Event Pesan" },
      { type: "bpmnErrorEvent", name: "Error Event", desc: "Event Kesalahan" },
      { type: "bpmnSignalEvent", name: "Signal Event", desc: "Event Isyarat" },
      { type: "bpmnConditionalEvent", name: "Conditional Event", desc: "Event Bersyarat" },
      { type: "bpmnAndGateway", name: "Parallel Gateway", desc: "Gerbang AND" },
      { type: "bpmnXorGateway", name: "Exclusive Gateway", desc: "Gerbang XOR" },
      { type: "bpmnPool", name: "Pool / Lane", desc: "Kolam Proses" },
    ],
  },
  {
    title: "Arrows",
    items: [
      { type: "arrowUp", name: "Arrow Up", desc: "Panah Blok Atas" },
      { type: "arrowDown", name: "Arrow Down", desc: "Panah Blok Bawah" },
      { type: "arrowUpDown", name: "Arrow Up Down", desc: "Panah Dua Arah" },
      { type: "curvedArrow", name: "Curved Arrow", desc: "Panah Melengkung" },
      { type: "homePlate", name: "Home Plate", desc: "Panah Hapus Sudut" },
      { type: "arrowCallout", name: "Arrow Callout", desc: "Label Bersambung Panah" },
    ],
  },
  {
    title: "Cloud & Network",
    items: [
      { type: "server", name: "Server", desc: "Mesin Layanan" },
      { type: "rack", name: "Rack / Cabinet", desc: "Lemari Perangkat" },
      { type: "queue", name: "Queue", desc: "Antrean Pesan" },
      { type: "container", name: "Container", desc: "Kemasan Enam Sisi" },
      { type: "loadBalancer", name: "Load Balancer", desc: "Pembagi Beban" },
      { type: "cdnEdge", name: "CDN Edge", desc: "Titik Tepi Jaringan" },
      { type: "dns", name: "DNS Resolver", desc: "Nama Domain" },
      { type: "lock", name: "Lock / Secrets", desc: "Gerendel Aman" },
      { type: "key", name: "Key", desc: "Kunci Akses" },
      { type: "internet", name: "Internet", desc: "Jaringan Global" },
      { type: "wifi", name: "Wireless", desc: "Sinyal Nirkabel" },
      { type: "firewall", name: "Firewall", desc: "Tembok Api" },
      { type: "laptop", name: "Laptop", desc: "Perangkat Kerja" },
      { type: "mobile", name: "Mobile Device", desc: "Perangkat Genggam" },
      { type: "printer", name: "Printer", desc: "Alat Cetak" },
      { type: "person", name: "Person", desc: "Satu Orang" },
      { type: "team", name: "Team", desc: "Kelompok Orang" },
      { type: "apiGateway", name: "API Gateway", desc: "Gerbang Layanan" },
    ],
  },
  {
    title: "Entity Relationship",
    items: [
      { type: "erEntity", name: "Entity", desc: "Entitas dengan pemisah atribut" },
      { type: "erWeakEntity", name: "Weak Entity", desc: "Entitas lemah bergaris ganda" },
      { type: "erAttribute", name: "Attribute", desc: "Atribut berbentuk elips" },
      { type: "erKeyAttribute", name: "Key Attribute", desc: "Atribut kunci bergaris ganda" },
      {
        type: "erDerivedAttribute",
        name: "Derived Attribute",
        desc: "Atribut turunan putus-putus",
      },
      { type: "erMultiValued", name: "Multi-Valued Attribute", desc: "Atribut banyak nilai" },
      { type: "erRelationship", name: "Relationship", desc: "Relasi belah ketupat" },
      { type: "erCrowsFoot", name: "Crow's Foot", desc: "Kaki gagak simbol banyak" },
    ],
  },
  {
    title: "Logic Gates",
    items: [
      { type: "gateAnd", name: "AND Gate", desc: "Gerbang DAN kanonik" },
      { type: "gateOr", name: "OR Gate", desc: "Gerbang ATAU kurva ganda" },
      { type: "gateNot", name: "NOT Gate", desc: "Inverter segitiga berbintik" },
      { type: "gateNand", name: "NAND Gate", desc: "DAN dengan sangkalan" },
      { type: "gateNor", name: "NOR Gate", desc: "ATAU dengan sangkalan" },
      { type: "gateXor", name: "XOR Gate", desc: "ATAU eksklusif bersisi ganda" },
      { type: "gateMux", name: "Multiplexer", desc: "Pemilih jalur trapesium" },
      { type: "gateFlipFlop", name: "Flip-Flop", desc: "Sel memori bertanda jam" },
    ],
  },
  {
    title: "Swimlane & VSM",
    items: [
      { type: "laneHorizontal", name: "Horizontal Lane", desc: "Lane melebar per peran" },
      { type: "laneVertical", name: "Vertical Lane", desc: "Lane menurun per tahap" },
      { type: "poolLane", name: "Pool With Lanes", desc: "Kolam berbar judul" },
      { type: "vsmProcess", name: "VSM Process", desc: "Proses value stream berkaki" },
      { type: "vsmData", name: "VSM Data", desc: "Corong data dan informasi" },
      { type: "vsmInventory", name: "VSM Inventory", desc: "Persediaan berjalan" },
      { type: "vsmWait", name: "VSM Wait", desc: "Antrean tunggu berjari jam" },
      { type: "vsmKanbanPillar", name: "Kanban Pillar", desc: "Pilar kanban penarik aliran" },
    ],
  },
  {
    title: "Wireframe",
    items: [
      { type: "uiBrowser", name: "Browser Window", desc: "Jendela berbar alamat" },
      { type: "uiMobile", name: "Mobile Screen", desc: "Layar ponsel berlekuk" },
      { type: "uiButton", name: "UI Button", desc: "Tombol kapsul" },
      { type: "uiInput", name: "Text Input", desc: "Kolom isian dengan kursor" },
      { type: "uiCheckbox", name: "Checkbox", desc: "Kotak centang" },
      { type: "uiRadio", name: "Radio Button", desc: "Pilihan tunggal bundar" },
      { type: "uiDropdown", name: "Dropdown", desc: "Menu pilihan bercaret" },
      { type: "uiImagePlaceholder", name: "Image Placeholder", desc: "Gambar sementara" },
    ],
  },
  {
    title: "Network Symbols",
    items: [
      { type: "netRouter", name: "Router", desc: "Pengarah paket empat jurusan" },
      { type: "netSwitch", name: "Switch", desc: "Sakelar multi porta" },
      { type: "netHub", name: "Hub", desc: "Pusat simpul berbentuk bintang" },
      { type: "netFirewall", name: "Firewall Wall", desc: "Tembok bata penyaring" },
      { type: "netWirelessAp", name: "Access Point", desc: "Titik akses nirkabel" },
      { type: "netStorage", name: "Storage Cylinder", desc: "Silinder penyimpanan" },
      { type: "netSubnet", name: "Subnet", desc: "Blok jaringan putus-putus" },
      { type: "netClient", name: "Client Workstation", desc: "Klien bermonitor" },
    ],
  },
  {
    title: "Electrical & P&ID",
    items: [
      { type: "elResistor", name: "Resistor", desc: "Hambatan zigzag berkaki" },
      { type: "elCapacitor", name: "Capacitor", desc: "Kapasitor dua pelat sejajar" },
      { type: "elInductor", name: "Inductor", desc: "Kumparan induktor bergelombang" },
      { type: "elGround", name: "Ground", desc: "Arde bertiang tiga garis" },
      { type: "elLamp", name: "Lamp", desc: "Lampu bersilang di dalam" },
      { type: "elMotor", name: "Motor", desc: "Motor listrik lingkaran bergores" },
      { type: "pidValve", name: "P&ID Valve", desc: "Katup dasi kupu-kupu beroda" },
      { type: "pidPump", name: "P&ID Pump", desc: "Pompa dengan panah keluar" },
    ],
  },
];

/**
 * Ukuran yang BENAR-BENAR tergambar untuk satu bentuk.
 *
 * `width`/`height` boleh kosong pada papan lama dan pada diagram hasil impor
 * sebagian. Angka cadangannya dulu ditulis empat tempat dengan tiga nilai
 * berbeda (120 di minimap, 130 di perender + routing, 140 di `getNodeCenter`),
 * jadi pusat garis bisa meleset dari kotak yang terlihat. Satu-satunya angka
 * yang boleh dipakai adalah yang dipakai perender bentuk.
 */
const UKURAN_CADANGAN = { width: 130, height: 70 } as const;

export function ukuranBentukEfektif(node: { width?: number; height?: number }): {
  width: number;
  height: number;
} {
  return {
    width: node.width || UKURAN_CADANGAN.width,
    height: node.height || UKURAN_CADANGAN.height,
  };
}

/**
 * Kotak pembungkus seluruh bentuk di papan, dalam koordinat papan.
 *
 * Dipakai "pas ke layar" (#618): yang harus muat adalah yang TERLIHAT, jadi
 * ukurannya diambil dari `ukuranBentukEfektif`, bukan dari angka lain. Papan
 * kosong memulangkan `null` — pemanggil tidak boleh mengira isi (0,0).
 */
export function batasSeluruhBentuk(
  nodes: { x: number; y: number; width?: number; height?: number }[]
): { x: number; y: number; width: number; height: number } | null {
  if (nodes.length === 0) return null;
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const n of nodes) {
    const { width, height } = ukuranBentukEfektif(n);
    x1 = Math.min(x1, n.x);
    y1 = Math.min(y1, n.y);
    x2 = Math.max(x2, n.x + width);
    y2 = Math.max(y2, n.y + height);
  }
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}
