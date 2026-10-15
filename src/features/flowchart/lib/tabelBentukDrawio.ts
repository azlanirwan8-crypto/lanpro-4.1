/**
 * TABEL bentuk draw.io → tipe native LanPro. Data murni, tanpa logika.
 *
 * SUMBER SETIAP NAMA: `kamusBentukDrawio.ts`, yang diambil 15 Okt dari definisi
 * pustaka draw.io sendiri (cabang `dev` jgraph/drawio) dengan MENJALANKAN
 * `js/grapheditor/Sidebar.js` dan `js/diagramly/sidebar/Sidebar-*.js`, lalu
 * mencatat `style=` yang benar-benar mereka hasilkan, ditambah nama yang
 * terdaftar di perender lewat `mxCellRenderer.registerShape`.
 *
 * KENAPA ATURAN INI KETAT. Versi pertama #752 menulis tabel ini dari dugaan.
 * Diukur terhadap kamus: **206 dari 248 kunci `PETA_SHAPE` tidak pernah ada di
 * draw.io** (`usertask`, `timer_event`, `umlclass`, `4_point_star`, dst.), dan
 * 45 kunci `PETA_PUSTAKA` juga karangan — tiga namespace utuh (`mxgraph.uml`,
 * `mxgraph.er`, `mxgraph.aws`) tidak eksis. Kerusakannya ganda: angka cakupan
 * yang dihasilkan mengukur karangan itu sendiri, dan di sisi EKSPOR nama karangan
 * jauh lebih buruk daripada tidak menulis apa pun, karena mxGraph merender
 * `shape=` yang tak dikenal sebagai sel TANPA GAMBAR sama sekali — bukan
 * persegi panjang. Jadi tabel ini hanya memuat nama yang ada di kamus, dan
 * `petaBentukDrawio-752.test.tsx` menolak kunci di luar kamus.
 *
 * NAMA YANG SENGAJA TIDAK DIPETAKAN juga keputusan, bukan kelalaian: bentuk
 * yang tidak punya padanan native jatuh ke `rect` DAN dilaporkan
 * `batasKonversi` sebagai kehilangan (#685). Daftarnya ada di bagian bawah.
 */
import type { FlowNodeType } from "../types";

/**
 * Nilai `shape=` TELANJANG (tanpa namespace), huruf kecil.
 *
 * Dua entri yang dihapus karena terbukti salah, dan keduanya penting:
 *  - `or` dan `xor` BUKAN lingkaran logika. `app.min.js` mendaftarkan keduanya
 *    sebagai turunan `mxActor`: `or` menggambar `moveTo(0,0); quadTo(n,0,n,u/2);
 *    quadTo(n,u,0,u)` — sisi kiri lurus, sisi kanan cembung (bentuk D); `xor`
 *    menambah `quadTo(n/2,u/2,0,0)` sehingga jadi bulan sabit. Peta lama menulis
 *    `or -> connectorOr`, yaitu lingkaran-bersilang yang sama sekali bukan itu.
 *    Lingkaran logika draw.io yang sesungguhnya adalah `mxgraph.flowchart.or_2`
 *    dan `mxgraph.flowchart.summing_junction`.
 */
export const PETA_SHAPE: Readonly<Record<string, FlowNodeType>> = {
  // ── bentuk inti mxGraph (sah sebagai `shape=` maupun token pertama) ───────
  actor: "actor",
  arrow: "arrowRight",
  arrowconnector: "arrowRight",
  cloud: "cloud",
  cylinder: "cylinder",
  doubleellipse: "erMultiValued",
  ellipse: "oval",
  hexagon: "hexagon",
  image: "uiImagePlaceholder",
  label: "rect",
  rectangle: "rect",
  rect: "rect",
  rhombus: "diamond",
  swimlane: "laneVertical",
  text: "text",
  triangle: "triangle",

  // ── geometri terdaftar di perender ────────────────────────────────────────
  cube: "cube",
  isocube: "cube",
  isocube2: "cube",
  isorectangle: "rect",
  cylinder2: "cylinder",
  cylinder3: "cylinder",
  lineellipse: "oval",
  parallelogram: "parallelogram",
  trapezoid: "trapezoid",
  step: "homePlate",
  tee: "tShape",
  cross: "cross",
  plus: "cross",
  curlybracket: "curlyLeft",

  // ── flowchart klasik ──────────────────────────────────────────────────────
  callout: "callout",
  wedgecallout: "callout",
  card: "card",
  collate: "collate",
  datastorage: "storage",
  // `shape=datastore` digambar mxGraph sebagai persegi panjang dengan dua
  // palang horizontal — itulah Data Store BPMN, bukan tabung basis data. Satu-
  // satunya entri sidebar yang memakainya adalah `Sidebar-BPMN.js` ("Data
  // Store"); tabung datang dari `mxgraph.flowchart.database` dan `cylinder3`.
  datastore: "bpmnDataStore",
  delay: "delay",
  display: "display",
  document: "document",
  doublearrow: "arrowLeftRight",
  flexarrow: "arrowRight",
  singlearrow: "arrowRight",
  taperedarrow: "arrowRight",
  internalstorage: "container",
  looplimit: "loopLimit",
  manualinput: "manualInput",
  note: "sticky",
  offpageconnector: "offPage",
  parallelmarker: "parallelMode",
  process: "subprocess",
  sortshape: "sort",
  tape: "draftDocument",
  tapedata: "draftDocument",

  // ── aktor & UML. draw.io TIDAK punya namespace `mxgraph.uml`: seluruh
  //    bentuk UML-nya telanjang, dan itu sebabnya `shape=umlActor` (bukan
  //    `shape=mxgraph.uml.actor`) yang dipakai berkas nyata.
  component: "umlComponent",
  module: "umlComponent",
  endstate: "umlActivityFinal",
  startstate: "umlInitial",
  sumellipse: "umlActivityFinal",
  lollipop: "umlInterface",
  providedrequiredinterface: "umlInterface",
  requiredinterface: "umlInterface",
  note2: "umlNote",
  process2: "umlClass",
  umlactor: "actor",
  umlboundary: "umlBoundary",
  umlcontrol: "umlControl",
  umldestroy: "cross",
  umlentity: "umlEntity",
  umlframe: "container",
  umllifeline: "umlObject",
  umlstate: "rect",
  seqactorstick: "actor",
  seqboundary: "umlBoundary",
  seqcontrol: "umlControl",
  seqdatabase: "database",
  seqentity: "umlEntity",
  seqqueue: "queue",
  curvedtext: "text",

  // ── ER. draw.io TIDAK punya namespace `mxgraph.er`: entity-nya persegi
  //    panjang polos, dan sisanya bentuk telanjang di bawah ini.
  associativeentity: "erEntity",
  ext: "erWeakEntity",

  // ── tabel & wadah ─────────────────────────────────────────────────────────
  table: "container",

  // ── lain-lain yang terdaftar ──────────────────────────────────────────────
  folder: "folder",
  gittag: "tag",
  mermaidblockarrow: "arrowRight",
  mermaidperson: "person",
  mermaidusecaseactor: "actor",
};

/**
 * Token PERTAMA `style=` tanpa `shape=`. mxGraph memperlakukan token pertama
 * yang bukan `kunci=nilai` sebagai nama bentuk, jadi `ellipse;whiteSpace=wrap`
 * dan `shape=ellipse;whiteSpace=wrap` berarti hal yang sama.
 *
 * Sengaja HANYA bentuk inti mxGraph: lapisan 3 resolver memindai SEMUA token,
 * jadi kata umum yang dimasukkan ke sini akan salah tangkap. `line` dan
 * `connector` tidak ada karena keduanya tidak punya padanan native.
 */
export const PETA_TOKEN: Readonly<Record<string, FlowNodeType>> = {
  actor: "actor",
  arrow: "arrowRight",
  cloud: "cloud",
  cylinder: "cylinder",
  doubleellipse: "erMultiValued",
  ellipse: "oval",
  hexagon: "hexagon",
  image: "uiImagePlaceholder",
  label: "rect",
  rectangle: "rect",
  rhombus: "diamond",
  swimlane: "laneVertical",
  text: "text",
  triangle: "triangle",
};

/**
 * Sufiks per pustaka ber-namespace. Kunci luarnya awalan `shape=`, kunci dalamnya
 * sisa sesudah awalan itu — BOLEH bertitik (`"buttons.button"`), karena
 * `cariDiPustaka` mencoba sisa utuh lebih dulu baru segmen terakhir.
 *
 * Dicocokkan per pustaka, bukan `includes`: `mxgraph.mockup.text.callout` dan
 * `mxgraph.basic.cloud_callout` harus tetap berbeda arti.
 */
export const PETA_PUSTAKA: Readonly<Record<string, Readonly<Record<string, FlowNodeType>>>> = {
  "mxgraph.flowchart": {
    annotation_1: "annotationLeft",
    annotation_2: "annotationRight",
    collate: "collate",
    database: "database",
    decision: "decision",
    delay: "delay",
    direct_data: "storage",
    display: "display",
    document2: "document",
    extract_or_measurement: "extract",
    loop_limit: "loopLimit",
    merge_or_storage: "merge",
    "multi-document": "multiDocument",
    "on-page_reference": "connectorSmall",
    or_2: "connectorOr",
    parallel_mode: "parallelMode",
    sequential_data: "sequentialData",
    sort: "sort",
    start_1: "rect",
    start_2: "oval",
    stored_data: "storage",
    summing_junction: "summingJunction",
    terminator: "rect",
  },
  "mxgraph.basic": {
    "4_point_star_2": "star4",
    "6_point_star": "hexagram",
    "8_point_star": "star",
    acute_triangle: "triangle",
    arc: "quarterDisc",
    banner: "banner",
    button: "uiButton",
    cloud_callout: "cloudCallout",
    cloud_rect: "cloud",
    cone: "cone",
    cone2: "cone",
    corner_round_rect: "rect",
    diag_round_rect: "rect",
    diag_snip_rect: "rect",
    diag_stripe: "parallelogram",
    document: "document",
    donut: "ring",
    drop: "pieSlice",
    flash: "stamp",
    frame: "container",
    frame_corner: "container",
    half_circle: "semicircleUp",
    heart: "bubbleRound",
    isocube: "cube",
    layered_rect: "multiDocument",
    loud_callout: "callout",
    moon: "semicircleDown",
    no_symbol: "ring",
    obtuse_triangle: "triangle",
    octagon2: "octagon",
    orthogonal_triangle: "triangle",
    oval_callout: "callout",
    partconcellipse: "semicircleDown",
    patternfillrect: "rect",
    pentagon: "pentagon",
    pie: "pieSlice",
    plaque: "rect",
    plaque_frame: "container",
    pointed_oval: "lens",
    pyramid: "triangle",
    rect: "rect",
    rectcallout: "callout",
    rounded_frame: "container",
    roundrectcallout: "callout",
    shaded_button: "uiButton",
    smiley: "bubbleRound",
    star: "star",
    sun: "star",
    three_corner_round_rect: "rect",
    tick: "chevron",
    wave2: "draftDocument",
    x: "cross",
  },
  /**
   * BPMN draw.io hanya punya ENAM stensil; seluruh variasinya — 217 entri
   * sidebar — dibedakan oleh parameter (`taskMarker=`, `symbol=`, `gwType=`),
   * yang diputuskan `bentukDariParameter`, bukan oleh nama bentuk.
   */
  "mxgraph.bpmn": {
    conversation2: "bpmnPool",
    data2: "bpmnDataObject",
    event: "bpmnEvent",
    gateway2: "bpmnGateway",
    swimlane: "bpmnPool",
    task2: "bpmnTask",
  },
  "mxgraph.arrows2": {
    arrow: "arrowRight",
    bendarrow: "curvedArrow",
    benddoublearrow: "arrowLeftRight",
    calloutarrow: "arrowCallout",
    calloutdouble90arrow: "arrowCallout",
    calloutdoublearrow: "arrowCallout",
    calloutquadarrow: "arrowCallout",
    jumpinarrow: "curvedArrow",
    quadarrow: "arrowUpDown",
    sharparrow: "arrowRight",
    sharparrow2: "arrowRight",
    stripedarrow: "arrowRight",
    stylisedarrow: "arrowRight",
    tailedarrow: "arrowRight",
    tailednotchedarrow: "arrowRight",
    triadarrow: "arrowUpDown",
    twowayarrow: "arrowLeftRight",
    uturnarrow: "curvedArrow",
    wedgearrow: "chevron",
    wedgearrowdashed2: "chevron",
  },
  "mxgraph.networks": {
    biometric_reader: "netClient",
    bus: "netSubnet",
    business_center: "container",
    cloud: "internet",
    comm_link: "netSubnet",
    comm_link_edge: "netSubnet",
    community: "team",
    copier: "printer",
    desktop_pc: "netClient",
    external_storage: "netStorage",
    firewall: "netFirewall",
    gamepad: "netClient",
    hub: "netHub",
    laptop: "laptop",
    load_balancer: "loadBalancer",
    mail_server: "server",
    mainframe: "server",
    mobile: "uiMobile",
    modem: "netWirelessAp",
    monitor: "netClient",
    nas_filer: "netStorage",
    patch_panel: "netSwitch",
    pc: "netClient",
    phone_1: "netClient",
    phone_2: "netClient",
    printer: "printer",
    proxy_server: "server",
    rack: "rack",
    radio_tower: "netWirelessAp",
    router: "netRouter",
    satellite: "internet",
    satellite_dish: "netWirelessAp",
    scanner: "printer",
    secured: "lock",
    security_camera: "netClient",
    server: "server",
    server_storage: "netStorage",
    storage: "netStorage",
    supercomputer: "server",
    switch: "netSwitch",
    tablet: "uiMobile",
    tape_storage: "netStorage",
    terminal: "netClient",
    unsecure: "key",
    ups_enterprise: "server",
    ups_small: "server",
    usb_stick: "netStorage",
    user_female: "person",
    user_male: "person",
    users: "team",
    video_projector: "netClient",
    video_projector_screen: "netClient",
    virtual_pc: "netClient",
    virtual_server: "server",
    virus: "netFirewall",
    web_server: "server",
    wireless_hub: "netWirelessAp",
    wireless_modem: "netWirelessAp",
  },
  "mxgraph.mockup": {
    "buttons.button": "uiButton",
    "buttons.onoffbutton": "uiCheckbox",
    "containers.userfemale": "person",
    "containers.usermale": "person",
    "containers.videoplayer": "uiBrowser",
    "containers.window": "uiBrowser",
    "forms.colorpicker": "uiInput",
    "forms.combobox": "uiDropdown",
    "forms.horslider": "uiInput",
    "forms.pwfield": "uiInput",
    "forms.rrect": "uiCheckbox",
    "forms.searchbox": "uiInput",
    "forms.spinner": "uiInput",
    "forms.splitter": "uiInput",
    "graphics.barchart": "uiImagePlaceholder",
    "graphics.bubblechart": "uiImagePlaceholder",
    "graphics.columnchart": "uiImagePlaceholder",
    "graphics.linechart": "uiImagePlaceholder",
    "graphics.piechart": "uiImagePlaceholder",
    "graphics.plotchart": "uiImagePlaceholder",
    "graphics.simpleicon": "uiImagePlaceholder",
    "markup.curlybrace": "curlyLeft",
    "markup.redx": "stamp",
    "markup.scratchout": "stamp",
    "misc.copyrighticon": "badge",
    "misc.editicon": "uiImagePlaceholder",
    "misc.help_icon": "uiImagePlaceholder",
    "misc.loading_circle_1": "ring",
    "misc.loading_circle_2": "ring",
    "misc.mail2": "uiImagePlaceholder",
    "misc.map": "uiImagePlaceholder",
    "misc.pin": "badge",
    "misc.playbackcontrols": "uiInput",
    "misc.printicon": "uiImagePlaceholder",
    "misc.progressbar": "uiInput",
    "misc.rating": "badge",
    "misc.registeredicon": "badge",
    "misc.shareicon": "uiImagePlaceholder",
    "misc.shoppingcart": "uiImagePlaceholder",
    "misc.trashcanicon": "uiImagePlaceholder",
    "misc.volumeicon": "uiImagePlaceholder",
    "misc.volumeslider": "uiInput",
    "navigation.coverflow": "uiBrowser",
    "navigation.mapnavigator": "uiBrowser",
    "navigation.pagecontrol": "uiRadio",
    "navigation.pagination": "uiRadio",
    "navigation.scrollbar": "uiInput",
    "navigation.stepbar": "uiRadio",
    "text.alphanumeric": "uiInput",
    "text.bulletedlist": "uiInput",
    "text.callout": "callout",
    "text.captcha": "uiInput",
    "text.stickynote2": "sticky",
    "text.textbox": "uiInput",
  },
  "mxgraph.electrical": {
    "logic_gates.buffer2": "gateNot",
    "logic_gates.d_type_flip-flop": "gateFlipFlop",
    "logic_gates.d_type_rs_flip-flop": "gateFlipFlop",
    "logic_gates.dual_inline_ic": "container",
    "logic_gates.inverter_2": "gateNot",
    "logic_gates.inverting_contact": "gateNot",
    "logic_gates.jk_flip-flop": "gateFlipFlop",
    "logic_gates.qfp_ic": "container",
    "logic_gates.rs_latch": "gateFlipFlop",
    "logic_gates.schmitt_trigger": "gateNot",
    "logic_gates.t_type_flip-flop": "gateFlipFlop",
    "iec_logic_gates.and": "gateAnd",
    "iec_logic_gates.nand_2": "gateNand",
    "iec_logic_gates.nor_2": "gateNor",
    "iec_logic_gates.not_2": "gateNot",
    "iec_logic_gates.or": "gateOr",
    "iec_logic_gates.xor": "gateXor",
    // Di luar keluarga gerbang: tiga komponen yang padanannya nyata ada di
    // palet native, dan satu `abstract.mux2` yang sidebar draw.io beri judul
    // "Mux" (varian `operation=demux`-nya adalah Demux — SENGAJA tidak
    // dipetakan, karena papan tidak punya tipe demux dan menebak `gateMux`
    // akan menggambar bentuk yang salah).
    "signal_sources.signal_ground": "elGround",
    "opto_electronics.lamp": "elLamp",
    "electro-mechanical.motor_2": "elMotor",
    "abstract.mux2": "gateMux",
  },
  "mxgraph.lean_mapping": {
    airplane_7: "arrowRight",
    batched_kanban: "vsmKanbanPillar",
    boat_shipment: "arrowRight",
    buffer_or_safety_stock: "vsmWait",
    control_center: "container",
    crossdock: "container",
    fifo_lane: "laneHorizontal",
    go_see_production_scheduling: "curvedArrow",
    inventory_box: "vsmInventory",
    kanban_post: "vsmKanbanPillar",
    load_leveling: "vsmData",
    manufacturing_process_shared: "vsmProcess",
    move_by_forklift: "arrowRight",
    mrp_erp: "vsmData",
    operator: "person",
    orders: "vsmData",
    outside_sources: "container",
    physical_pull: "curvedArrow",
    production_kanban: "vsmKanbanPillar",
    push_arrow: "arrowRight",
    quality_problem: "stamp",
    rail_shipment: "arrowRight",
    schedule: "vsmData",
    sequenced_pull_ball: "circle",
    signal_kanban: "vsmKanbanPillar",
    supermarket: "vsmData",
    timeline2: "laneHorizontal",
    verbal: "callout",
    warehouse: "container",
    withdrawal_kanban: "vsmKanbanPillar",
    work_cell: "vsmProcess",
  },
  "mxgraph.infographic": {
    banner: "banner",
    bannerhalffold: "banner",
    bannersinglefold: "banner",
    barcallout: "callout",
    bendingarch: "semicircleUp",
    circularcallout: "callout",
    circularcallout2: "callout",
    circulardial: "ring",
    cylinder: "cylinder",
    flag: "banner",
    numberedentryvert: "badge",
    parallelogram: "trapezoid",
    partconcellipse: "semicircleDown",
    pyramidstep: "triangle",
    ribbonbackfolded: "banner",
    ribbondoublefolded: "banner",
    ribbonfrontfolded: "banner",
    ribbonrolled: "banner",
    ribbonsimple: "banner",
    shadedcube: "cube",
    shadedpyramid: "triangle",
    shadedtriangle: "triangle",
  },
  "mxgraph.azure": {
    access_control: "lock",
    azure_active_directory: "azureUser",
    azure_cache: "azureStorage",
    azure_instance: "azureVm",
    azure_load_balancer: "loadBalancer",
    backup_service: "azureStorage",
    certificate: "key",
    cloud: "internet",
    computer: "azureVm",
    database: "azureSql",
    enterprise: "container",
    hdinsight: "azureSql",
    healthy: "badge",
    hyper_v_recovery_manager: "azureVm",
    laptop: "laptop",
    load_balancer_generic: "loadBalancer",
    mobile: "uiMobile",
    mysql_database: "azureSql",
    queue_generic: "queue",
    server: "azureVm",
    server_rack: "rack",
    sql_database: "azureSql",
    sql_database_sql_azure: "azureSql",
    sql_reporting: "azurePowerBi",
    storage: "azureStorage",
    storage_blob: "azureStorage",
    storage_queue: "azureStorage",
    storage_table: "azureStorage",
    storsimple: "azureStorage",
    tablet: "uiMobile",
    user: "azureUser",
    vhd: "azureStorage",
    vhd_data_disk: "azureStorage",
    virtual_machine: "azureVm",
    virtual_machine_feature: "azureVm",
    web_role: "azureVm",
    web_roles: "azureVm",
    worker_role: "azureVm",
    worker_roles: "azureVm",
  },
  // `mxgraph.aws4` berisi 598 ikon dan palet native hanya punya 7 ikon AWS,
  // jadi TIDAK ADA pemetaan massal yang jujur. Empat baris di bawah adalah
  // yang padanannya persis satu-satu menurut judul sidebar draw.io sendiri
  // ("Lambda Function", "Bucket", "RDS Instance", "VPC"). Sisanya — termasuk
  // 40-an varian `*_instance` yang tidak punya padanan `awsEc2` tunggal, dan
  // seluruh `cloudwatch_*`/`dynamodb_*` yang hanya ada sebagai varian — tetap
  // jatuh ke `rect` DAN dilaporkan `batasKonversi` sebagai kehilangan.
  "mxgraph.aws4": {
    lambda_function: "awsLambda",
    bucket: "awsS3",
    rds_instance: "awsRds",
    vpc_virtual_private_cloud_vpc: "awsVpc",
  },
};

/**
 * Pustaka yang bentuknya dikelompokkan per KELUARGA, bukan per nama.
 *
 * `mxgraph.electrical` punya 347 stensil, tetapi palet native hanya punya 6
 * komponen pasif. Menyebut 347 nama satu per satu tidak menambah apa pun, dan
 * menebak sisanya akan salah — jadi yang dipetakan hanya tiga keluarga yang
 * padanannya nyata, dan sisanya (diode, transistor, MOSFET, sakelar, sumber
 * sinyal, gelombang, instrumentasi, PLC ladder, elektro-mekanik) tetap jatuh ke
 * `rect` DAN dilaporkan sebagai kehilangan.
 */
export const PETA_KELUARGA: Readonly<Record<string, Readonly<Record<string, FlowNodeType>>>> = {
  "mxgraph.electrical": {
    resistors: "elResistor",
    capacitors: "elCapacitor",
    inductors: "elInductor",
  },
};

/**
 * Bentuk yang NAMANYA sama tetapi gambarnya berbeda menurut parameter. Di sini
 * letak perbedaan terbesar draw.io dan peta berbasis nama: sidebar BPMN
 * menawarkan 217 bentuk yang seluruhnya berasal dari ENAM stensil.
 *
 * Nilai parameternya dibaca dari korpus, bukan dikarang: `taskMarker` ∈
 * {abstract, businessRule, manual, receive, script, send, service, user},
 * `bpmnShapeType` ∈ {call, subprocess, transaction}, `gwType` ∈ {complex,
 * exclusive, parallel}, `symbol` ∈ {cancel, compensation, conditional, error,
 * escalation, general, link, message, multiple, none, parallelMultiple, signal,
 * star, terminate, terminate2, timer}, `operation` ∈ {and, or, xor} dengan
 * `negating=1`.
 */
export const PENANDA_TUGAS_BPMN: Readonly<Record<string, FlowNodeType>> = {
  abstract: "bpmnTask",
  businessrule: "bpmnBusinessRuleTask",
  manual: "bpmnTask",
  receive: "bpmnReceiveTask",
  script: "bpmnScriptTask",
  send: "bpmnSendTask",
  service: "bpmnServiceTask",
  user: "bpmnUserTask",
};

export const JENIS_AKTIVITAS_BPMN: Readonly<Record<string, FlowNodeType>> = {
  call: "bpmnActivity",
  subprocess: "bpmnActivity",
  transaction: "bpmnActivity",
};

export const SIMBOL_EVENT_BPMN: Readonly<Record<string, FlowNodeType>> = {
  conditional: "bpmnConditionalEvent",
  error: "bpmnErrorEvent",
  message: "bpmnMessageEvent",
  signal: "bpmnSignalEvent",
  terminate: "bpmnEventEnd",
  terminate2: "bpmnEventEnd",
  timer: "bpmnTimerEvent",
};

export const JENIS_GERBANG_BPMN: Readonly<Record<string, FlowNodeType>> = {
  complex: "bpmnGateway",
  exclusive: "bpmnXorGateway",
  parallel: "bpmnAndGateway",
};

/** `mxgraph.electrical.logic_gates.logic_gate` + `operation=`. */
export const OPERASI_GERBANG_LOGIKA: Readonly<Record<string, FlowNodeType>> = {
  and: "gateAnd",
  or: "gateOr",
  xor: "gateXor",
};

/** Bentuk yang sama dengan `negating=1`. XNOR tidak punya padanan native. */
export const OPERASI_GERBANG_NEGASI: Readonly<Record<string, FlowNodeType>> = {
  and: "gateNand",
  or: "gateNor",
  xor: "gateXor",
};

/**
 * `mxgraph.basic.polygon` adalah SATU stensil untuk semua poligon beraturan:
 * bentuknya ditentukan jumlah titik di `polyCoords`. draw.io sendiri memakainya
 * begitu — entri sidebar "Polygon" menulis delapan titik, jadi ia oktagon, bukan
 * pentagon. Memetakannya ke satu tipe tetap tanpa membaca `polyCoords` adalah
 * tebakan yang pasti salah untuk tujuh dari delapan poligon.
 */
export const POLIGON_BERATURAN: Readonly<Record<number, FlowNodeType>> = {
  5: "pentagon",
  6: "hexagon",
  7: "heptagon",
  8: "octagon",
  9: "nonagon",
};

/**
 * Nama sah di kamus yang SENGAJA tidak dipetakan, dengan alasannya. Daftar ini
 * dibaca test: mengosongkannya berarti mengklaim cakupan yang tidak ada, dan
 * menambah nama ke sini tanpa alasan adalah cara peta ini berbohong lagi.
 *
 * Yang terbesar adalah `mxgraph.aws4` (598 bentuk) — palet native hanya punya 7
 * ikon AWS, jadi tidak ada pemetaan jujur yang mungkin. Itu batas produk, bukan
 * bug peta, dan #685 menuntut ia dinyatakan.
 */
export const TANPA_PADANAN_NATIVE: Readonly<Record<string, string>> = {
  or: "bentuk D (turunan mxActor), bukan lingkaran logika; tidak ada padanannya",
  xor: "bulan sabit (turunan mxActor); tidak ada padanannya",
  partialrectangle: "persegi panjang dengan sisi yang dihilangkan (top=0/bottom=0)",
  transparent: "tidak terlihat sama sekali",
  waypoint: "penanda titik kecil di tengah garis",
  wire: "kabel putus-putus, digambar sebagai edge",
  zigzag: "garis zig-zag, tidak ada bentuk native bergaris",
  line: "garis lurus tunggal",
  connector: "bentuk edge, bukan vertex",
  fillededge: "bentuk edge, bukan vertex",
  corner: "sudut siku-siku tanpa padanan",
  crossbar: "palang dengan penyambung",
  dimension: "garis ukuran berpanah dua",
  ishikawahead: "kepala panah diagram Ishikawa",
  link: "penghubung percakapan BPMN, digambar sebagai edge",
  requires: "ketergantungan UML, digambar sebagai edge",
  message: "amplop pesan, tidak ada padanannya",
  mindmapbang: "lingkaran berpaku peta pikiran",
  smileyface: "wajah tersenyum; `bubbleRound` bukan wajah",
  switch: "sakelar, bukan `netSwitch` yang bergambar kotak jaringan",
  pipe: "pipa (tabung berujung elips); tidak ada bentuk native yang menggambarnya",
  tableline: "satu baris tabel",
  tablerow: "satu baris tabel",
  seqcollections: "koleksi objek sekuens (tumpukan kotak)",
  mermaidodd: "bentuk ganjil mermaid",
  mermaidsankeylink: "tautan diagram Sankey",
  gitcherrypick: "ikon git cherry-pick",
  gitmergecommit: "ikon git merge commit",
  orellipse: "elips bergaya 'or'; geometrinya tidak diverifikasi",
  "mxgraph.aws4.*":
    "594 dari 598 ikon AWS4: palet native hanya punya segelintir ikon AWS, sisanya ikon layanan proprietari",
  "mxgraph.electrical.*":
    "262 dari 349 stensil: diode, transistor, MOSFET, sakelar, sumber sinyal, gelombang, instrumentasi, PLC ladder, elektro-mekanik",
  "mxgraph.azure.*":
    "47 dari 86 ikon Azure klasik: berkas/skrip, service bus, dan ikon layanan proprietari",
  "mxgraph.uml25.*": "3 stensil aksi UML 2.5 berparameter; tidak ada padanan native",
  // Satu stensil untuk SEMUA segi-N: jumlah titiknya ada di `polyCoords`, bukan
  // di namanya. Sidebar draw.io tidak pernah mengirim `polygon` tanpa parameter
  // itu, jadi yang tidak terpetakan di sini adalah nama telanjangnya saja —
  // lihat `POLIGON_BERATURAN` untuk sisi-N yang benar-benar digambar.
  "mxgraph.basic.polygon":
    "segi-N ditentukan `polyCoords`, bukan namanya; tanpa parameter bentuknya tidak tertentu",
  "mxgraph.mockup.markup.line": "garis horizontal tunggal",
  "mxgraph.mockup.menus_and_buttons.*": "3 batang alat pemformatan teks",
  "mxgraph.mockup.misc.ruler2": "penggaris horizontal",
  "mxgraph.lean_mapping.electronic_info_flow_edge":
    "bentuk EDGE aliran informasi elektronik, bukan vertex; digambar sebagai garis",
  "mxgraph.lean_mapping.manual_info_flow_edge":
    "bentuk EDGE aliran informasi manual, bukan vertex; digambar sebagai garis",
  "mxgraph.lean_mapping.fifo_sequence_flow":
    "bentuk EDGE antrean FIFO (panah bergaris ganda), bukan vertex",
  "mxgraph.electrical.logic_gates.*_filter": "3 tapis frekuensi; tidak ada padanan",
};
