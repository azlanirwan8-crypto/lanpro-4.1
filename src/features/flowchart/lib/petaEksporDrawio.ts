/**
 * #753 — arah BALIK dari `petaBentukDrawio.ts`: tipe native papan → ejaan
 * `style=` draw.io.
 *
 * KENAPA BERKAS INI TERPISAH. Dua arah yang digabung membuat satu berkas lewat
 * batas 800 baris yang `agents.md` §4 tetapkan. Dipisah juga membuat keduanya
 * bisa diuji terpisah: arah masuk dijaga `petaBentukDrawio-752.test.tsx`, arah
 * keluar dijaga `petaEksporDrawio-753.test.tsx` yang menjalankan keduanya
 * BERPASANGAN.
 *
 * TIDAK ADA SATU PUN EJAAN DI SINI YANG DITULIS TANGAN LALU DIPERCAYA. Seluruh
 * 177 baris `PETA_BALIK` dibangkitkan dengan menjalankan resolver impor atas
 * korpus 2.900 gaya sidebar draw.io sungguhan, lalu menyaring yang terbaca balik
 * menjadi tipe yang dimaksud. Jadi invariant round-trip-nya benar menurut
 * konstruksi, bukan menurut klaim — dan test-nya tetap ada untuk memastikan
 * tidak ada yang menyimpang sesudahnya.
 *
 * Versi pertama berkas ini ditulis dari dugaan dan mengandung tiga namespace
 * yang TIDAK EKSIS di draw.io (`mxgraph.uml.*`, `mxgraph.er.*`, `mxgraph.aws.*`)
 * beserta puluhan nama karangan. Kerusakannya lebih parah daripada tidak
 * menulis apa pun: mxGraph merender `shape=` yang tak dikenal sebagai sel TANPA
 * GAMBAR sama sekali, jadi berkas ekspor kita akan membuka draw.io sebagai
 * papan kosong sambil test round-trip kita tetap hijau.
 *
 * KERUGIAN YANG DINYATAKAN. Sebagian baris punya `kembali`: ejaan itu digambar
 * BENAR oleh draw.io tetapi dibaca balik penjeraf kita sebagai tipe LAIN, karena
 * draw.io memang tidak punya bentuk bernama untuknya (seluruh atribut ER adalah
 * elips, "Use Case" adalah `ellipse;`, "Manual Operation" adalah trapesium).
 * Kerugiannya ditulis di sini, bukan disembunyikan di balik angka round-trip
 * yang terlihat sempurna.
 */
import type { FlowNodeType } from "../types";

export type EjaanBalik = {
  /** Awalan `style=` yang ditulis ke berkas `.drawio`. */
  gaya: string;
  /**
   * Tipe yang dihasilkan penjeraf kita saat membaca `gaya` itu kembali.
   * Diisi HANYA bila berbeda dari kuncinya — yaitu kerugian yang dinyatakan.
   */
  kembali?: FlowNodeType;
};

/**
 * Tipe native yang memang tidak punya padanan draw.io, DENGAN alasannya.
 *
 * Bentuk-bentuk ini keluar sebagai persegi panjang polos (bawaan draw.io) dan
 * daftarnya dijaga test supaya tidak membesar diam-diam. Menulis
 * `shape=tag` supaya round-trip terlihat sempurna sementara draw.io
 * menampilkannya sel kosong adalah klaim palsu — dan `AUDIT.md` §15.3 mencatat
 * layar draw.io tidak bisa dibandingkan dari mesin ini, jadi satu-satunya klaim
 * yang boleh dibuat adalah yang bisa dihitung test.
 */
export const TANPA_PADANAN_DRAWIO: Readonly<Record<string, string>> = {
  apiGateway: "draw.io hanya punya gerbang sebagai stensil vendor (AWS/Azure), bukan bentuk umum",
  cdnEdge: "tidak ada stensil CDN di pustaka draw.io bawaan",
  dns: "tidak ada stensil DNS di pustaka draw.io bawaan",
  firewall:
    "`mxgraph.networks.firewall` sudah dipakai tipe `netFirewall`; dua tipe native satu stensil",
  mobile: "`mxgraph.networks.mobile` dan `mxgraph.azure.mobile` sudah dipakai `uiMobile`",
  wifi: "draw.io memakai `mxgraph.networks.wireless_hub`, yang sudah dipetakan ke `netWirelessAp`",
  awsEc2:
    "aws4 tidak punya `ec2` tunggal — hanya 40-an varian `ec2_c6i_instance`, `m5_instance`, dst.",
  awsCloudwatch:
    "aws4 tidak punya `cloudwatch` — hanya varian `cloudwatch_logs`, `cloudwatch_rum`, dst.",
  awsDynamo: "aws4 tidak punya `dynamodb` — hanya `dynamodb_stream`, `dynamodb_dax`, dst.",
  azureCosmos: "tidak ada nama cosmos/documentdb di `mxgraph.azure` yang terverifikasi",
  azureFunctions: "tidak ada nama function di `mxgraph.azure` yang terverifikasi",
  azureKeyVault: "tidak ada nama key_vault di `mxgraph.azure` yang terverifikasi",
  braceRight: "draw.io hanya punya satu `curlybracket`, mengarah kiri",
  bracketLeft: "tidak ada stensil kurung siku di draw.io",
  bracketRight: "tidak ada stensil kurung siku di draw.io",
  curlyRight: "draw.io hanya punya satu `curlybracket`, mengarah kiri",
  bubbleTailLeft:
    "bentuk hiasan papan ini; draw.io membuatnya dari `shape=callout` dengan parameter ekor",
  bubbleTailRight:
    "bentuk hiasan papan ini; draw.io membuatnya dari `shape=callout` dengan parameter ekor",
  bubbleTailUp:
    "bentuk hiasan papan ini; draw.io membuatnya dari `shape=callout` dengan parameter ekor",
  speechDouble: "tidak ada stensilnya di draw.io",
  noteCorner: "tidak ada stensilnya di draw.io",
  chord: "`mxgraph.basic.arc` adalah busur, bukan tali busur tertutup",
  compare: "tidak ada stensilnya di draw.io",
  erCrowsFoot:
    "kaki gagak adalah MATA PANAH (`endArrow=ERmany`), bukan bentuk — ditangani `kepalaPanah.tsx`",
  sphere: "draw.io tidak punya bola; `mxgraph.basic` hanya punya `cone`, `cone2`, dan `donut`",
  lShape:
    "`shape=corner` terdaftar di perender tetapi tidak muncul di sidebar mana pun, jadi gambarnya tidak terverifikasi",
  pidPump: "draw.io bawaan tidak punya pustaka P&ID",
  pidValve: "draw.io bawaan tidak punya pustaka P&ID",
  punchCard:
    "`mxgraph.flowchart.card` adalah kartu bersudut terpotong yang sudah dipakai tipe `card`",
  umlDependency: "di draw.io ini GARIS (`endArrow=open;dashed=1`), bukan bentuk",
  umlGeneralization: "di draw.io ini GARIS (`endArrow=block;endFill=0`), bukan bentuk",
};

/**
 * Tabel balik. Kunci = tipe native, nilai = ejaan draw.io.
 *
 * `rect` SENGAJA tidak ada: persegi panjang adalah bawaan draw.io, jadi ia
 * keluar tanpa awalan bentuk (lihat `default` di `gayaBentukDrawIo`).
 */
export const PETA_BALIK: Readonly<Partial<Record<FlowNodeType, EjaanBalik>>> = {
  // ── geometri dasar ──────────────────────────────────────────────
  circle: { gaya: "ellipse;aspect=fixed;" },
  cone: { gaya: "shape=mxgraph.basic.cone;" },
  cross: { gaya: "shape=umlDestroy;" },
  cube: { gaya: "shape=cube;" },
  curlyLeft: { gaya: "shape=mxgraph.mockup.markup.curlyBrace;" },
  diamond: { gaya: "rhombus;" },
  heptagon: {
    gaya: "shape=mxgraph.basic.polygon;polyCoords=[[0.50,0.00],[0.89,0.19],[0.99,0.61],[0.72,0.95],[0.28,0.95],[0.01,0.61],[0.11,0.19]];polyline=0;",
  },
  hexagon: { gaya: "shape=hexagon;" },
  hexagram: { gaya: "shape=mxgraph.basic.6_point_star;" },
  homePlate: { gaya: "shape=step;" },
  lens: { gaya: "shape=mxgraph.basic.pointed_oval;" },
  nonagon: {
    gaya: "shape=mxgraph.basic.polygon;polyCoords=[[0.50,0.00],[0.82,0.12],[0.99,0.41],[0.93,0.75],[0.67,0.97],[0.33,0.97],[0.07,0.75],[0.01,0.41],[0.18,0.12]];polyline=0;",
  },
  octagon: { gaya: "shape=mxgraph.basic.octagon2;dx=15;" },
  oval: { gaya: "ellipse;" },
  pentagon: { gaya: "shape=mxgraph.basic.pentagon;" },
  pieSlice: { gaya: "shape=mxgraph.basic.drop;" },
  quarterDisc: { gaya: "shape=mxgraph.basic.arc;startAngle=0.3;endAngle=0.1;" },
  ring: { gaya: "shape=mxgraph.basic.no_symbol;" },
  semicircleDown: { gaya: "shape=mxgraph.basic.moon;" },
  semicircleUp: { gaya: "shape=mxgraph.basic.half_circle;" },
  star: { gaya: "shape=mxgraph.basic.sun;" },
  star4: { gaya: "shape=mxgraph.basic.4_point_star_2;dx=0.8;" },
  tShape: { gaya: "shape=tee;" },
  text: { gaya: "text;" },
  trapezoid: { gaya: "shape=trapezoid;" },
  triangle: { gaya: "triangle;" },
  braceLeft: { gaya: "shape=curlybracket;", kembali: "curlyLeft" },
  // ── flowchart klasik ────────────────────────────────────────────
  annotationLeft: { gaya: "shape=mxgraph.flowchart.annotation_1;" },
  annotationRight: { gaya: "shape=mxgraph.flowchart.annotation_2;" },
  callout: { gaya: "shape=callout;" },
  card: { gaya: "shape=card;" },
  cloud: { gaya: "ellipse;shape=cloud;" },
  cloudCallout: { gaya: "shape=mxgraph.basic.cloud_callout;" },
  collate: { gaya: "shape=mxgraph.flowchart.collate;" },
  connectorOr: { gaya: "shape=mxgraph.flowchart.or_2;" },
  connectorSmall: { gaya: "shape=mxgraph.flowchart.on-page_reference;" },
  cylinder: { gaya: "shape=cylinder3;size=15;" },
  database: { gaya: "shape=mxgraph.flowchart.database;" },
  decision: { gaya: "shape=mxgraph.flowchart.decision;" },
  delay: { gaya: "shape=mxgraph.flowchart.delay;" },
  display: { gaya: "shape=mxgraph.flowchart.display;" },
  document: { gaya: "shape=document;" },
  draftDocument: { gaya: "shape=tape;" },
  extract: { gaya: "shape=mxgraph.flowchart.extract_or_measurement;" },
  loopLimit: { gaya: "shape=mxgraph.flowchart.loop_limit;" },
  manualInput: { gaya: "shape=manualInput;rounded=1;size=26;" },
  merge: { gaya: "shape=mxgraph.flowchart.merge_or_storage;" },
  multiDocument: { gaya: "shape=mxgraph.flowchart.multi-document;" },
  offPage: { gaya: "shape=offPageConnector;rounded=0;size=0.5;" },
  parallelMode: { gaya: "shape=mxgraph.flowchart.parallel_mode;" },
  parallelogram: { gaya: "shape=parallelogram;" },
  sequentialData: { gaya: "shape=mxgraph.flowchart.sequential_data;" },
  sort: { gaya: "shape=mxgraph.flowchart.sort;" },
  sticky: { gaya: "shape=note;" },
  storage: { gaya: "shape=dataStorage;" },
  subprocess: { gaya: "shape=process;" },
  summingJunction: { gaya: "shape=mxgraph.flowchart.summing_junction;" },
  manualOperation: { gaya: "shape=trapezoid;perimeter=trapezoidPerimeter;", kembali: "trapezoid" },
  predefined: { gaya: "shape=process;size=0.14;", kembali: "subprocess" },
  preparation: { gaya: "shape=hexagon;size=0.27;", kembali: "hexagon" },
  // ── wadah & lane ────────────────────────────────────────────────
  container: { gaya: "shape=umlFrame;" },
  laneHorizontal: { gaya: "swimlane;horizontal=0;" },
  laneVertical: { gaya: "swimlane;" },
  umlSwimlane: { gaya: "swimlane;", kembali: "laneVertical" },
  poolLane: { gaya: "swimlane;horizontal=0;", kembali: "laneHorizontal" },
  // ── UML ─────────────────────────────────────────────────────────
  actor: { gaya: "shape=umlActor;" },
  umlActivityFinal: { gaya: "ellipse;shape=endState;" },
  umlBoundary: { gaya: "shape=umlBoundary;" },
  umlClass: { gaya: "shape=process2;size=5;" },
  umlComponent: { gaya: "shape=module;" },
  umlControl: { gaya: "ellipse;shape=umlControl;" },
  umlEntity: { gaya: "ellipse;shape=umlEntity;" },
  umlInitial: { gaya: "shape=startstate;" },
  umlInterface: { gaya: "shape=requiredInterface;" },
  umlNote: { gaya: "shape=note2;size=25;" },
  umlObject: { gaya: "shape=umlLifeline;" },
  umlUseCase: { gaya: "ellipse;", kembali: "oval" },
  umlPackage: { gaya: "shape=folder;", kembali: "folder" },
  // ── BPMN ────────────────────────────────────────────────────────
  bpmnActivity: { gaya: "shape=mxgraph.bpmn.task2;size=10;bpmnShapeType=call;" },
  bpmnAndGateway: { gaya: "shape=mxgraph.bpmn.gateway2;symbol=none;gwType=parallel;" },
  bpmnBusinessRuleTask: { gaya: "shape=mxgraph.bpmn.task2;size=10;taskMarker=businessRule;" },
  bpmnConditionalEvent: { gaya: "shape=mxgraph.bpmn.event;aspect=fixed;symbol=conditional;" },
  bpmnDataObject: { gaya: "shape=mxgraph.bpmn.data2;size=15;" },
  bpmnDataStore: { gaya: "shape=datastore;" },
  bpmnErrorEvent: { gaya: "shape=mxgraph.bpmn.event;aspect=fixed;symbol=error;" },
  bpmnEvent: { gaya: "shape=mxgraph.bpmn.event;aspect=fixed;symbol=link;" },
  bpmnEventEnd: { gaya: "shape=mxgraph.bpmn.event;aspect=fixed;symbol=terminate;" },
  bpmnGateway: { gaya: "shape=mxgraph.bpmn.gateway2;symbol=none;" },
  bpmnMessageEvent: { gaya: "shape=mxgraph.bpmn.event;aspect=fixed;symbol=message;" },
  bpmnPool: { gaya: "shape=mxgraph.bpmn.conversation2;aspect=fixed;" },
  bpmnReceiveTask: { gaya: "shape=mxgraph.bpmn.task2;size=10;taskMarker=receive;" },
  bpmnScriptTask: { gaya: "shape=mxgraph.bpmn.task2;size=10;taskMarker=script;" },
  bpmnSendTask: { gaya: "shape=mxgraph.bpmn.task2;size=10;taskMarker=send;" },
  bpmnServiceTask: { gaya: "shape=mxgraph.bpmn.task2;size=10;taskMarker=service;" },
  bpmnSignalEvent: { gaya: "shape=mxgraph.bpmn.event;aspect=fixed;symbol=signal;" },
  bpmnTask: { gaya: "shape=mxgraph.bpmn.task2;taskMarker=abstract;" },
  bpmnTimerEvent: { gaya: "shape=mxgraph.bpmn.event;aspect=fixed;symbol=timer;" },
  bpmnUserTask: { gaya: "shape=mxgraph.bpmn.task2;size=10;taskMarker=user;" },
  bpmnXorGateway: { gaya: "shape=mxgraph.bpmn.gateway2;symbol=none;gwType=exclusive;" },
  // ── panah ───────────────────────────────────────────────────────
  arrowCallout: { gaya: "shape=mxgraph.arrows2.calloutDouble90Arrow;" },
  arrowDown: { gaya: "shape=mxgraph.arrows2.arrow;dy=0.6;dx=40;direction=south;" },
  arrowLeft: { gaya: "shape=mxgraph.arrows2.arrow;direction=west;" },
  arrowLeftRight: { gaya: "shape=mxgraph.arrows2.twoWayArrow;dy=0.6;dx=35;" },
  arrowRight: { gaya: "shape=mxgraph.arrows2.arrow;dy=0.6;dx=40;" },
  arrowUp: { gaya: "shape=mxgraph.arrows2.arrow;dy=0.6;dx=40;direction=north;" },
  arrowUpDown: { gaya: "shape=mxgraph.arrows2.quadArrow;dy=10;dx=20;" },
  chevron: { gaya: "shape=mxgraph.basic.tick;" },
  curvedArrow: { gaya: "shape=mxgraph.arrows2.uTurnArrow;dy=11;" },
  // ── Entity-Relation ─────────────────────────────────────────────
  erEntity: { gaya: "shape=associativeEntity;" },
  erMultiValued: { gaya: "ellipse;shape=doubleEllipse;margin=3;" },
  erWeakEntity: { gaya: "shape=ext;margin=3;double=1;" },
  erRelationship: { gaya: "rhombus;", kembali: "diamond" },
  erAttribute: { gaya: "ellipse;", kembali: "oval" },
  erKeyAttribute: { gaya: "ellipse;", kembali: "oval" },
  erDerivedAttribute: { gaya: "ellipse;dashed=1;", kembali: "oval" },
  // ── mockup antarmuka ────────────────────────────────────────────
  uiBrowser: { gaya: "shape=mxgraph.mockup.containers.window;" },
  uiButton: { gaya: "shape=mxgraph.basic.button;dx=10;" },
  uiCheckbox: { gaya: "shape=mxgraph.mockup.forms.rrect;" },
  uiDropdown: { gaya: "shape=mxgraph.mockup.forms.comboBox;" },
  uiImagePlaceholder: { gaya: "shape=mxgraph.mockup.misc.map;" },
  uiInput: { gaya: "shape=mxgraph.mockup.text.textBox;" },
  uiMobile: { gaya: "shape=mxgraph.networks.mobile;" },
  uiRadio: { gaya: "shape=mxgraph.mockup.navigation.stepBar;" },
  // ── jaringan & infrastruktur ────────────────────────────────────
  internet: { gaya: "shape=mxgraph.networks.cloud;" },
  key: { gaya: "shape=mxgraph.networks.unsecure;" },
  laptop: { gaya: "shape=mxgraph.networks.laptop;" },
  loadBalancer: { gaya: "shape=mxgraph.networks.load_balancer;" },
  lock: { gaya: "shape=mxgraph.networks.secured;" },
  netClient: { gaya: "shape=mxgraph.networks.pc;" },
  netFirewall: { gaya: "shape=mxgraph.networks.virus;" },
  netHub: { gaya: "shape=mxgraph.networks.hub;" },
  netRouter: { gaya: "shape=mxgraph.networks.router;" },
  netStorage: { gaya: "shape=mxgraph.networks.storage;" },
  netSubnet: { gaya: "shape=mxgraph.networks.bus;" },
  netSwitch: { gaya: "shape=mxgraph.networks.switch;" },
  netWirelessAp: { gaya: "shape=mxgraph.networks.modem;" },
  person: { gaya: "shape=mermaidPerson;" },
  printer: { gaya: "shape=mxgraph.networks.copier;" },
  queue: { gaya: "shape=mxgraph.azure.queue_generic;" },
  rack: { gaya: "shape=mxgraph.networks.rack;" },
  server: { gaya: "shape=mxgraph.networks.server;" },
  team: { gaya: "shape=mxgraph.networks.users;" },
  // ── elektronika & gerbang logika ────────────────────────────────
  elCapacitor: { gaya: "shape=mxgraph.electrical.capacitors.capacitor_1;" },
  elGround: { gaya: "shape=mxgraph.electrical.signal_sources.signal_ground;" },
  elInductor: { gaya: "shape=mxgraph.electrical.inductors.choke;" },
  elLamp: { gaya: "shape=mxgraph.electrical.opto_electronics.lamp;" },
  elMotor: { gaya: "shape=mxgraph.electrical.electro-mechanical.motor_2;" },
  elResistor: { gaya: "shape=mxgraph.electrical.resistors.resistor_1;" },
  gateAnd: { gaya: "shape=mxgraph.electrical.iec_logic_gates.and;" },
  gateFlipFlop: { gaya: "shape=mxgraph.electrical.logic_gates.rs_latch;" },
  gateMux: { gaya: "shape=mxgraph.electrical.abstract.mux2;" },
  gateNand: { gaya: "shape=mxgraph.electrical.iec_logic_gates.nand_2;" },
  gateNor: { gaya: "shape=mxgraph.electrical.iec_logic_gates.nor_2;" },
  gateNot: { gaya: "shape=mxgraph.electrical.logic_gates.buffer2;" },
  gateOr: { gaya: "shape=mxgraph.electrical.iec_logic_gates.or;" },
  gateXor: { gaya: "shape=mxgraph.electrical.iec_logic_gates.xor;" },
  // ── cloud ───────────────────────────────────────────────────────
  awsLambda: { gaya: "aspect=fixed;shape=mxgraph.aws4.lambda_function;" },
  awsRds: { gaya: "aspect=fixed;shape=mxgraph.aws4.rds_instance;" },
  awsS3: { gaya: "aspect=fixed;shape=mxgraph.aws4.bucket;" },
  awsVpc: { gaya: "aspect=fixed;shape=mxgraph.aws4.vpc_virtual_private_cloud_vpc;" },
  azurePowerBi: { gaya: "shape=mxgraph.azure.sql_reporting;" },
  azureSql: { gaya: "shape=mxgraph.azure.database;" },
  azureStorage: { gaya: "shape=mxgraph.azure.vhd;" },
  azureUser: { gaya: "shape=mxgraph.azure.user;" },
  azureVm: { gaya: "shape=mxgraph.azure.server;" },
  // ── Value Stream Mapping ────────────────────────────────────────
  vsmData: { gaya: "shape=mxgraph.lean_mapping.orders;" },
  vsmInventory: { gaya: "shape=mxgraph.lean_mapping.inventory_box;" },
  vsmKanbanPillar: { gaya: "shape=mxgraph.lean_mapping.kanban_post;" },
  vsmProcess: { gaya: "shape=mxgraph.lean_mapping.work_cell;" },
  vsmWait: { gaya: "shape=mxgraph.lean_mapping.buffer_or_safety_stock;" },
  // ── lain-lain ───────────────────────────────────────────────────
  badge: { gaya: "shape=mxgraph.mockup.misc.pin;" },
  banner: { gaya: "shape=mxgraph.basic.banner;" },
  bubbleRound: { gaya: "shape=mxgraph.basic.heart;" },
  folder: { gaya: "shape=folder;" },
  rect: { gaya: "shape=mxgraph.flowchart.start_1;" },
  stamp: { gaya: "shape=mxgraph.basic.flash;" },
  tag: { gaya: "shape=gitTag;" },
};

/**
 * Ejaan draw.io untuk satu tipe native, atau `null` bila memang tidak ada
 * padanannya — pemanggil lalu menulis persegi panjang polos.
 */
export const ejaanUntuk = (tipe: FlowNodeType): EjaanBalik | null => PETA_BALIK[tipe] ?? null;
