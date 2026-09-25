/**
 * Katalog bentuk tambahan (#541).
 *
 * SATU definisi geometri dipakai dua kali: oleh renderer kanvas
 * (`renderEkstraShape`, direntang ke ukuran node lewat viewBox + preserveAspectRatio
 * "none") dan oleh ikon pratinjau di panel kiri (`renderEkstraPreviewIcon`,
 * proporsinya dijaga). Dulu keduanya ditulis terpisah di enam berkas domain, dan
 * itulah sebabnya delapan bentuk punya gambar di kanvas tapi kotak generik di
 * panel.
 *
 * Semua koordinat dalam kotak 0..100. Bentuk yang cuma garis menggambar dirinya
 * dengan `fill="none"` SETELAH spread props supaya warna garisnya tetap ikut
 * tema dan seleksi.
 */
import React from "react";
import type { FlowNode } from "../../types";

type Pembuat = (p: any) => React.ReactNode;

const BENTUK: Record<string, Pembuat> = {
  /* ── Geometri dasar ─────────────────────────────────────────────────── */
  heptagon: (p) => (
    <polygon points="50,0 89.2,18.8 98.7,61.1 71.5,95 28.5,95 1.3,61.1 10.8,18.8" {...p} />
  ),
  nonagon: (p) => (
    <polygon
      points="50,0 82.1,11.7 99.2,41.3 93.3,75 67.1,97 32.9,97 6.7,75 0.8,41.3 17.9,11.7"
      {...p}
    />
  ),
  ring: (p) => (
    <path d="M50,2 A48,48 0 1,0 50.1,2 Z M50,26 A24,24 0 1,1 49.9,26 Z" fillRule="evenodd" {...p} />
  ),
  semicircleUp: (p) => <path d="M0,100 A50,50 0 0,1 100,100 Z" {...p} />,
  semicircleDown: (p) => <path d="M0,0 A50,50 0 0,0 100,0 Z" {...p} />,
  quarterDisc: (p) => <path d="M0,0 L70,0 A70,70 0 0,1 0,70 Z" {...p} />,
  chord: (p) => <path d="M2,74 A52,52 0 0,1 98,74 Z" {...p} />,
  pieSlice: (p) => <path d="M50,50 L50,0 A50,50 0 0,1 93.3,75 Z" {...p} />,
  lens: (p) => <path d="M22,4 Q86,50 22,96 Q-42,50 22,4 Z" {...p} />,
  cube: (p) => (
    <>
      <polygon points="16,28 56,12 92,28 52,44" {...p} />
      <polygon points="16,28 52,44 52,90 16,74" {...p} />
      <polygon points="52,44 92,28 92,74 52,90" {...p} />
    </>
  ),
  cone: (p) => (
    <>
      <path d="M50,4 L90,72 A40,14 0 0,1 10,72 Z" {...p} />
      <ellipse cx="50" cy="72" rx="40" ry="14" fill="none" stroke="currentColor" strokeWidth={2} />
    </>
  ),
  sphere: (p) => (
    <>
      <circle cx="50" cy="50" r="46" {...p} />
      <ellipse
        cx="50"
        cy="50"
        rx="46"
        ry="16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <ellipse
        cx="50"
        cy="50"
        rx="16"
        ry="46"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </>
  ),
  lShape: (p) => <polygon points="8,6 44,6 44,58 92,58 92,94 8,94" {...p} />,
  tShape: (p) => <polygon points="6,6 94,6 94,40 66,40 66,94 34,94 34,40 6,40" {...p} />,
  star4: (p) => <polygon points="50,0 62,38 100,50 62,62 50,100 38,62 0,50 38,38" {...p} />,
  hexagram: (p) => (
    <polygon points="50,2 63,30 93,26 74,50 93,74 63,70 50,98 37,70 7,74 26,50 7,26 37,30" {...p} />
  ),
  bracketLeft: (p) => (
    <path d="M64,8 L36,8 L36,92 L64,92" fill="none" stroke="currentColor" strokeWidth={6} {...p} />
  ),
  bracketRight: (p) => (
    <path d="M36,8 L64,8 L64,92 L36,92" fill="none" stroke="currentColor" strokeWidth={6} {...p} />
  ),
  braceLeft: (p) => (
    <path
      d="M66,6 Q44,6 44,28 Q44,46 30,50 Q44,54 44,72 Q44,94 66,94"
      fill="none"
      stroke="currentColor"
      strokeWidth={6}
      {...p}
    />
  ),
  braceRight: (p) => (
    <path
      d="M34,6 Q56,6 56,28 Q56,46 70,50 Q56,54 56,72 Q56,94 34,94"
      fill="none"
      stroke="currentColor"
      strokeWidth={6}
      {...p}
    />
  ),

  /* ── Panah ──────────────────────────────────────────────────────────── */
  arrowUp: (p) => <polygon points="50,0 94,44 68,44 68,100 32,100 32,44 6,44" {...p} />,
  arrowDown: (p) => <polygon points="50,100 6,56 32,56 32,0 68,0 68,56 94,56" {...p} />,
  arrowUpDown: (p) => (
    <polygon points="50,0 88,34 66,34 66,66 88,66 50,100 12,66 34,66 34,34 12,34" {...p} />
  ),
  curvedArrow: (p) => (
    <>
      <path d="M8,84 Q18,30 74,26" fill="none" stroke="currentColor" strokeWidth={8} {...p} />
      <polygon points="96,24 62,6 66,42" {...p} />
    </>
  ),
  homePlate: (p) => <polygon points="0,20 60,20 100,50 60,80 0,80" {...p} />,

  /* ── Flowchart ANSI ─────────────────────────────────────────────────── */
  extract: (p) => <polygon points="6,6 94,6 50,50 94,94 6,94 50,50" {...p} />,
  offPage: (p) => <polygon points="6,6 94,6 94,70 62,96 62,70 6,70" {...p} />,
  connectorSmall: (p) => <circle cx="50" cy="50" r="30" {...p} />,
  loopLimit: (p) => <polygon points="6,6 94,6 94,94 30,94 6,70" {...p} />,
  storage: (p) => (
    <>
      <path d="M6,22 A44,16 0 0,1 94,22 L94,78 A44,16 0 0,1 6,78 Z" {...p} />
      <path d="M6,22 A44,16 0 0,0 94,22" fill="none" stroke="currentColor" strokeWidth={2} />
    </>
  ),
  annotationLeft: (p) => (
    <path d="M20,6 L8,6 L8,94 L20,94" fill="none" stroke="currentColor" strokeWidth={5} {...p} />
  ),
  annotationRight: (p) => (
    <path d="M80,6 L92,6 L92,94 L80,94" fill="none" stroke="currentColor" strokeWidth={5} {...p} />
  ),
  punchCard: (p) => (
    <>
      <polygon points="6,6 94,6 94,78 78,94 6,94" {...p} />
      <circle cx="50" cy="50" r="9" fill="none" stroke="currentColor" strokeWidth={3} />
    </>
  ),
  parallelMode: (p) => (
    <>
      <polygon points="50,2 98,50 50,98 2,50" {...p} />
      <path d="M28,50 L72,50" fill="none" stroke="currentColor" strokeWidth={4} />
    </>
  ),
  sequentialData: (p) => (
    <>
      <rect x="6" y="18" width="88" height="64" rx="6" {...p} />
      <path d="M22,18 L22,82 M38,18 L38,82" fill="none" stroke="currentColor" strokeWidth={3} />
    </>
  ),
  compare: (p) => (
    <>
      <polygon points="50,4 96,50 50,96 4,50" {...p} />
      <path d="M32,50 L68,50 M50,32 L50,68" fill="none" stroke="currentColor" strokeWidth={4} />
    </>
  ),
  draftDocument: (p) => <path d="M6,6 L94,6 L94,72 Q70,60 50,74 Q30,88 6,76 Z" {...p} />,

  /* ── UML ────────────────────────────────────────────────────────────── */
  umlPackage: (p) => (
    <>
      <rect x="6" y="22" width="88" height="72" rx="4" {...p} />
      <rect x="6" y="6" width="44" height="16" rx="4" {...p} />
    </>
  ),
  umlComponent: (p) => (
    <>
      <rect x="18" y="14" width="76" height="72" rx="4" {...p} />
      <rect x="6" y="32" width="14" height="12" rx="2" {...p} />
      <rect x="6" y="56" width="14" height="12" rx="2" {...p} />
    </>
  ),
  umlObject: (p) => (
    <>
      <rect x="6" y="14" width="88" height="72" rx="4" {...p} />
      <path d="M6,42 L94,42" fill="none" stroke="currentColor" strokeWidth={2} />
    </>
  ),
  umlInitial: (p) => <circle cx="50" cy="50" r="20" {...p} />,
  umlActivityFinal: (p) => (
    <>
      <circle cx="50" cy="50" r="22" {...p} />
      <circle cx="50" cy="50" r="12" fill="currentColor" stroke="none" />
    </>
  ),
  umlDependency: (p) => (
    <>
      <path
        d="M6,60 L78,60"
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        strokeDasharray="8,6"
      />
      <polygon points="96,60 74,48 74,72" {...p} />
    </>
  ),
  umlGeneralization: (p) => (
    <>
      <path d="M50,96 L50,40" fill="none" stroke="currentColor" strokeWidth={4} />
      <polygon points="50,4 30,44 70,44" fill="none" stroke="currentColor" strokeWidth={4} />
    </>
  ),
  umlSwimlane: (p) => (
    <>
      <rect x="4" y="8" width="92" height="84" rx="4" {...p} />
      <path d="M30,8 L30,92 M30,36 L96,36" fill="none" stroke="currentColor" strokeWidth={2} />
    </>
  ),

  /* ── BPMN ───────────────────────────────────────────────────────────── */
  bpmnTask: (p) => <rect x="4" y="18" width="92" height="64" rx="10" {...p} />,
  bpmnUserTask: (p) => (
    <>
      <rect x="4" y="18" width="92" height="64" rx="10" {...p} />
      <circle cx="50" cy="38" r="7" fill="none" stroke="currentColor" strokeWidth={3} />
      <path d="M38,66 Q50,50 62,66" fill="none" stroke="currentColor" strokeWidth={3} />
    </>
  ),
  bpmnServiceTask: (p) => (
    <>
      <rect x="4" y="18" width="92" height="64" rx="10" {...p} />
      <circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth={3} />
      <path
        d="M50,32 L50,38 M50,62 L50,68 M32,50 L38,50 M62,50 L68,50 M38,38 L42,42 M58,58 L62,62 M62,38 L58,42 M42,58 L38,62"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      />
    </>
  ),
  bpmnScriptTask: (p) => (
    <>
      <rect x="4" y="18" width="92" height="64" rx="10" {...p} />
      <path
        d="M34,62 Q42,54 50,60 Q58,66 66,56 M34,44 Q42,36 50,42 Q58,48 66,38"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      />
    </>
  ),
  bpmnBusinessRuleTask: (p) => (
    <>
      <rect x="4" y="18" width="92" height="64" rx="10" {...p} />
      <path
        d="M34,34 L66,34 L34,66 L66,66 M34,34 L34,66 M66,34 L66,66"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      />
    </>
  ),
  bpmnSendTask: (p) => (
    <>
      <rect x="4" y="18" width="92" height="64" rx="10" {...p} />
      <rect
        x="34"
        y="40"
        width="32"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      />
      <path d="M34,40 L50,52 L66,40" fill="none" stroke="currentColor" strokeWidth={3} />
    </>
  ),
  bpmnReceiveTask: (p) => (
    <>
      <rect x="4" y="18" width="92" height="64" rx="10" {...p} />
      <rect
        x="34"
        y="38"
        width="32"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      />
      <path d="M50,38 L50,62" fill="none" stroke="currentColor" strokeWidth={3} />
    </>
  ),
  bpmnTimerEvent: (p) => (
    <>
      <circle cx="50" cy="50" r="30" {...p} />
      <path d="M50,32 L50,50 L62,56" fill="none" stroke="currentColor" strokeWidth={3} />
    </>
  ),
  bpmnMessageEvent: (p) => (
    <>
      <circle cx="50" cy="50" r="30" {...p} />
      <rect
        x="34"
        y="40"
        width="32"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      />
      <path d="M34,40 L50,52 L66,40" fill="none" stroke="currentColor" strokeWidth={3} />
    </>
  ),
  bpmnErrorEvent: (p) => (
    <>
      <circle cx="50" cy="50" r="30" {...p} />
      <path d="M36,62 L48,38 L56,56 L68,36" fill="none" stroke="currentColor" strokeWidth={4} />
    </>
  ),
  bpmnSignalEvent: (p) => (
    <>
      <circle cx="50" cy="50" r="30" {...p} />
      <polygon points="50,32 62,54 38,54" fill="none" stroke="currentColor" strokeWidth={3} />
    </>
  ),
  bpmnConditionalEvent: (p) => (
    <>
      <circle cx="50" cy="50" r="30" {...p} />
      <path
        d="M36,42 L64,42 M38,52 L62,52 M40,62 L60,62"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      />
    </>
  ),
  bpmnAndGateway: (p) => (
    <>
      <polygon points="50,2 98,50 50,98 2,50" {...p} />
      <path d="M50,28 L50,72 M28,50 L72,50" fill="none" stroke="currentColor" strokeWidth={5} />
    </>
  ),
  bpmnXorGateway: (p) => (
    <>
      <polygon points="50,2 98,50 50,98 2,50" {...p} />
      <path d="M34,34 L66,66 M66,34 L34,66" fill="none" stroke="currentColor" strokeWidth={5} />
    </>
  ),
  bpmnPool: (p) => (
    <>
      <rect x="4" y="6" width="92" height="88" rx="2" {...p} />
      <path d="M18,6 L18,94 M4,50 L18,50" fill="none" stroke="currentColor" strokeWidth={2} />
    </>
  ),

  /* ── Callout & label ────────────────────────────────────────────────── */
  bubbleRound: (p) => (
    <>
      <ellipse cx="50" cy="42" rx="46" ry="34" {...p} />
      <polygon points="30,70 42,72 34,92" {...p} />
    </>
  ),
  bubbleTailLeft: (p) => <path d="M14,6 L94,6 L94,74 L40,74 L10,96 L18,74 L14,74 Z" {...p} />,
  bubbleTailRight: (p) => <path d="M6,6 L86,6 L86,74 L90,96 L62,74 L6,74 Z" {...p} />,
  bubbleTailUp: (p) => <path d="M30,4 L42,22 L86,22 L86,90 L14,90 L14,22 L22,4 Z" {...p} />,
  tag: (p) => (
    <>
      <path d="M40,6 L94,6 L94,94 L40,94 L6,50 Z" {...p} />
      <circle cx="56" cy="50" r="8" fill="none" stroke="currentColor" strokeWidth={3} />
    </>
  ),
  badge: (p) => (
    <>
      <circle cx="50" cy="44" r="34" {...p} />
      <polygon points="30,70 34,98 50,86 66,98 70,70" {...p} />
    </>
  ),
  banner: (p) => (
    <polygon points="2,18 98,18 98,74 78,74 88,88 60,74 40,74 12,88 22,74 2,74" {...p} />
  ),
  stamp: (p) => (
    <path
      d="M10,10 L90,10 L90,90 L10,90 Z M22,22 L78,22 L78,78 L22,78 Z"
      fillRule="evenodd"
      {...p}
    />
  ),
  noteCorner: (p) => (
    <>
      <path d="M8,6 L72,6 L92,26 L92,94 L8,94 Z" {...p} />
      <polygon points="72,6 72,26 92,26" fill="none" stroke="currentColor" strokeWidth={2} />
    </>
  ),
  cloudCallout: (p) => (
    <path
      d="M28,78 Q8,78 8,60 Q8,44 26,44 Q28,24 48,22 Q68,20 74,38 Q94,38 94,56 Q94,74 74,76 L34,92 Z"
      {...p}
    />
  ),
  speechDouble: (p) => (
    <>
      <rect x="6" y="8" width="88" height="66" rx="14" {...p} />
      <polygon points="24,74 36,74 26,96" {...p} />
      <polygon points="64,74 76,74 74,96" {...p} />
    </>
  ),
  arrowCallout: (p) => <polygon points="6,26 62,26 62,8 96,50 62,92 62,74 6,74" {...p} />,

  /* ── Cloud, jaringan & perangkat (gambar netral, tanpa logo pihak lain) ─ */
  server: (p) => (
    <>
      <rect x="14" y="10" width="72" height="36" rx="6" {...p} />
      <rect x="14" y="54" width="72" height="36" rx="6" {...p} />
      <path d="M26,28 L34,28 M26,72 L34,72" fill="none" stroke="currentColor" strokeWidth={4} />
    </>
  ),
  rack: (p) => (
    <>
      <rect x="16" y="6" width="68" height="88" rx="6" {...p} />
      <path
        d="M16,30 L84,30 M16,52 L84,52 M16,74 L84,74"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      />
    </>
  ),
  queue: (p) => (
    <>
      <rect x="6" y="30" width="18" height="40" rx="3" {...p} />
      <rect x="30" y="30" width="18" height="40" rx="3" {...p} />
      <rect x="54" y="30" width="18" height="40" rx="3" {...p} />
      <polygon points="96,50 78,38 78,62" {...p} />
    </>
  ),
  container: (p) => (
    <>
      <polygon points="50,6 92,28 92,72 50,94 8,72 8,28" {...p} />
      <path
        d="M50,6 L50,94 M8,28 L92,72 M92,28 L8,72"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />
    </>
  ),
  loadBalancer: (p) => (
    <>
      <circle cx="50" cy="50" r="28" {...p} />
      <path d="M50,22 L50,78 M22,50 L78,50" fill="none" stroke="currentColor" strokeWidth={3} />
    </>
  ),
  cdnEdge: (p) => (
    <>
      <circle cx="50" cy="50" r="40" {...p} />
      <path
        d="M10,50 L90,50 M50,10 Q72,50 50,90 M50,10 Q28,50 50,90"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />
    </>
  ),
  dns: (p) => (
    <>
      <circle cx="50" cy="50" r="38" {...p} />
      <path
        d="M12,50 L88,50 M50,12 Q70,50 50,88"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />
      <circle cx="50" cy="50" r="12" fill="none" stroke="currentColor" strokeWidth={3} />
    </>
  ),
  lock: (p) => (
    <>
      <rect x="20" y="44" width="60" height="46" rx="8" {...p} />
      <path
        d="M32,44 L32,30 A18,14 0 0,1 68,30 L68,44"
        fill="none"
        stroke="currentColor"
        strokeWidth={6}
      />
    </>
  ),
  key: (p) => (
    <>
      <circle cx="32" cy="40" r="22" {...p} />
      <path
        d="M46,54 L82,90 M70,78 L82,66 M60,68 L72,56"
        fill="none"
        stroke="currentColor"
        strokeWidth={6}
      />
    </>
  ),
  internet: (p) => (
    <>
      <circle cx="50" cy="50" r="40" {...p} />
      <path
        d="M10,38 L90,38 M10,62 L90,62 M50,10 Q26,50 50,90 M50,10 Q74,50 50,90"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />
    </>
  ),
  wifi: (p) => (
    <>
      <path
        d="M10,52 Q50,12 90,52 M24,66 Q50,42 76,66 M38,80 Q50,70 62,80"
        fill="none"
        stroke="currentColor"
        strokeWidth={6}
      />
      <circle cx="50" cy="90" r="6" {...p} />
    </>
  ),
  firewall: (p) => (
    <>
      <rect x="6" y="14" width="88" height="72" rx="4" {...p} />
      <path
        d="M6,38 L94,38 M6,62 L94,62 M34,14 L34,38 M66,38 L66,62 M34,62 L34,86"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      />
    </>
  ),
  laptop: (p) => (
    <>
      <rect x="18" y="14" width="64" height="46" rx="4" {...p} />
      <path d="M6,72 L94,72 L86,86 L14,86 Z" {...p} />
    </>
  ),
  mobile: (p) => (
    <>
      <rect x="28" y="6" width="44" height="88" rx="10" {...p} />
      <path d="M42,84 L58,84" fill="none" stroke="currentColor" strokeWidth={4} />
    </>
  ),
  printer: (p) => (
    <>
      <rect x="14" y="36" width="72" height="34" rx="6" {...p} />
      <rect x="26" y="10" width="48" height="26" rx="3" {...p} />
      <rect x="26" y="66" width="48" height="26" rx="3" {...p} />
    </>
  ),
  person: (p) => (
    <>
      <circle cx="50" cy="28" r="18" {...p} />
      <path d="M14,96 Q50,48 86,96 Z" {...p} />
    </>
  ),
  team: (p) => (
    <>
      <circle cx="34" cy="32" r="16" {...p} />
      <path d="M4,96 Q34,52 64,96 Z" {...p} />
      <circle cx="68" cy="38" r="13" {...p} />
      <path d="M46,96 Q68,62 92,96 Z" {...p} />
    </>
  ),
  apiGateway: (p) => (
    <>
      <polygon points="50,4 94,30 94,74 50,100 6,74 6,30" {...p} />
      <path
        d="M28,50 L44,50 M56,50 L72,50 M44,40 L44,60 M56,40 L56,60"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      />
    </>
  ),
};

/**
 * Delapan bentuk digambar sebagai div/Tailwind di kanvas (`nodeTheme.ts`), jadi
 * mereka tidak pernah masuk rantai SVG — akibatnya ikonnya di panel kiri jatuh ke
 * kotak indigo generik. Tabel ini HANYA untuk pratinjau dan sengaja tidak
 * diekspor lewat `ekstraTypes` supaya kanvas tidak ikut beralih ke SVG.
 */
const IKON_PRATINJAU: Record<string, Pembuat> = {
  document: (p) => (
    <>
      <path d="M14,8 L66,8 L86,28 L86,92 L14,92 Z" {...p} />
      <path d="M66,8 L66,28 L86,28" fill="none" stroke="currentColor" strokeWidth={3} />
    </>
  ),
  subprocess: (p) => (
    <>
      <rect x="6" y="14" width="88" height="72" rx="6" {...p} />
      <rect
        x="16"
        y="24"
        width="68"
        height="52"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      />
    </>
  ),
  predefined: (p) => (
    <>
      <rect x="6" y="14" width="88" height="72" rx="6" {...p} />
      <path d="M18,14 L18,86 M82,14 L82,86" fill="none" stroke="currentColor" strokeWidth={4} />
    </>
  ),
  folder: (p) => <path d="M6,22 L38,22 L48,34 L94,34 L94,86 L6,86 Z" {...p} />,
  cloud: (p) => (
    <path
      d="M30,80 Q8,80 8,62 Q8,46 26,46 Q30,24 52,22 Q74,20 80,40 Q96,42 96,58 Q96,78 76,80 Z"
      {...p}
    />
  ),
  card: (p) => (
    <>
      <path d="M8,8 L74,8 L92,26 L92,92 L8,92 Z" {...p} />
      <path
        d="M8,8 L8,26 L26,26 L26,8 M8,44 L92,44"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      />
    </>
  ),
  parallelogram: (p) => <polygon points="26,12 96,12 74,88 4,88" {...p} />,
  sticky: (p) => (
    <>
      <path d="M8,8 L92,8 L92,72 L72,92 L8,92 Z" {...p} />
      <path d="M92,72 L72,72 L72,92" fill="none" stroke="currentColor" strokeWidth={3} />
    </>
  ),
  actor: (p) => (
    <>
      <circle cx="50" cy="22" r="14" {...p} />
      <path
        d="M50,36 L50,68 M20,48 L80,48 M50,68 L32,94 M50,68 L68,94"
        fill="none"
        stroke="currentColor"
        strokeWidth={6}
      />
    </>
  ),
};

/** Semua tipe yang digambar berkas ini — dipakai registrasi dan test kelengkapan. */
export const ekstraTypes = Object.keys(BENTUK);

export function renderEkstraShape(
  node: FlowNode,
  svgProps: any,
  elementProps: any
): React.ReactNode | null {
  const bikin = BENTUK[node.type];
  if (!bikin) return null;
  return <svg {...svgProps}>{bikin(elementProps)}</svg>;
}

export function renderEkstraPreviewIcon(type: string, commonProps: any, elementProps: any) {
  const bikin = BENTUK[type] || IKON_PRATINJAU[type];
  if (!bikin) return null;
  return <svg {...commonProps}>{bikin(elementProps)}</svg>;
}
