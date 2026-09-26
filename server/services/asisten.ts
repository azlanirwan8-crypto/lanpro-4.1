/**
 * Otak "LanPro AI Assistant" (#551).
 *
 * Kenapa berkas ini ada. Sebelum 26 Sep 2026 asisten hanya menerima teks
 * pertanyaan pengguna — tanpa riwayat, tanpa data siapa pun — lalu diminta
 * "berikan saran praktis seputar manajemen tugas, debugging, figma, database,
 * atau motivasi kerja" dengan temperature 0,8 (chat.routes.ts:267-292). Ia
 * tidak mungkin menjawab seperti asisten pribadi karena memang tidak diberi
 * apa pun untuk dijawab: setiap jawaban adalah karangan yang masuk akal.
 *
 * Yang berubah di sini:
 *  1. KONTEKS — daftar proyek yang boleh dilihat penanya + tugasnya sendiri,
 *     dibaca dari repository yang sama dipakai aplikasi, dengan cakupan dari
 *     `req.user` (BUKAN dari body).
 *  2. PERKAKAS — model boleh meminta data tambahan (mencari tugas, merangkum
 *     satu proyek). Eksekusinya di server, dan setiap perkakas memeriksa ulang
 *     bahwa proyek yang diminta benar terlihat oleh penanya.
 *  3. MEMORI — beberapa giliran percakapan terakhir ikut dikirim, jadi "yang
 *     tadi" punya rujukan.
 *  4. JUJUR — tanpa kunci API tidak ada karangan persona; pengguna menerima
 *     pesan bahwa asisten sedang tidak tersambung. Model juga diizinkan
 *     menjawab "datanya tidak ada".
 *
 * Semua fungsi di sini murni terhadap transport: `ai` disuntik dari luar, jadi
 * uji bisa menjalankan seluruh lingkaran perkakas tanpa jaringan.
 */
import { projectRepository } from "../repositories/project.repository";
import { taskRepository } from "../repositories/task.repository";
// Satu sumber kebenaran untuk "tugas ini sudah selesai" — sama persis dengan
// yang dipakai kartu jumlah di dasbor. Kalau asisten memakai daftarnya sendiri,
// angkanya bisa berbeda dari papan dan tidak ada yang tahu mana yang benar.
import { statusSelesai } from "../../src/lib/statusSelesai";

export type PemanggilAsisten = { id: string; role: string; nama?: string };

/** Batas keras: jawaban asisten tidak boleh mengubah ukuran basis data. */
const MAKS_PROYEK = 8;
const MAKS_TUGAS_PER_PROYEK = 400;
const MAKS_BARIS_KONTKS = 24;
const MAKS_ROUNDS_ALAT = 3;

/**
 * Model yang benar-benar dikirim ke Google. UI sengaja TIDAK menyebut versi
 * model - dulu header tertulis "Gemini 3.5 Assistant", klaim yang tidak bisa
 * dibuktikan dari berkas mana pun. Yang dibaca pengguna sekarang: jawaban ini
 * datang dari datanya sendiri.
 */
const MODEL_ASISTEN = "gemini-flash-latest";

/**
 * Anggaran waktu satu balasan (#554).
 *
 * Diukur dengan generator cadangan model yang dipakai fitur AI lain
 * (generateContentWithFallback) dan klien yang sengaja gagal: kunci salah,
 * kuota habis, dan 503 selesai di bawah 1 detik karena limiter memotong ke
 * model berikutnya tanpa jeda. TAPI "TypeError: fetch failed" mencoba 12 kali
 * dan makan 18,1 detik. Fungsi ini punya maxDuration 30 detik
 * (vercel.json:14), dan satu pesan asisten bisa memanggil model sampai 4 kali
 * (awal + 3 ronde perkakas) -> 4 x 18 d = 72 d: fungsi dibunuh, balasan tidak
 * pernah tersimpan, dan pengguna hanya melihat indikator "sedang mengetik"
 * yang hilang sendiri.
 *
 * Karena itu obrolan tidak memakai rantai lima model itu: satu model utama,
 * satu cadangan, dan satu tenggat yang dihitung sejak awal giliran.
 */
const BATAS_TOTAL_MS = 18000;
const MODEL_CADANGAN = [MODEL_ASISTEN, "gemini-2.5-flash"];

const terbuka = (t: any) => !statusSelesai(t?.status);
const lewatTenggat = (t: any) => {
  const d = t.endDate || t.dueDate;
  if (!d) return false;
  const ms = new Date(d).getTime();
  return Number.isFinite(ms) && ms < Date.now();
};

/** Satu-satunya sumber cakupan: proyek yang boleh dilihat pemanggil. */
async function proyekTerlihat(pemanggil: PemanggilAsisten) {
  const rows = await projectRepository.findProjectsForCaller(pemanggil.id, pemanggil.role);
  return (rows || []).slice(0, MAKS_PROYEK);
}

type TugasRingkas = {
  id: string;
  key: string;
  judul: string;
  status: string;
  tenggat: string | null;
  proyek: string;
  proyekId: string;
  lembur: boolean;
};

function persempit(t: any, namaProyek: string): TugasRingkas {
  return {
    id: String(t.id),
    key: String(t.taskKey || t.key || ""),
    judul: String(t.title || ""),
    status: String(t.status || ""),
    tenggat: t.endDate ? String(t.endDate).slice(0, 10) : null,
    proyek: namaProyek,
    proyekId: String(t.projectId || ""),
    lembur: lewatTenggat(t),
  };
}

/** Tugas milik pemanggil (bukan seluruh tim) di proyek yang boleh ia lihat. */
async function tugasMilik(pemanggil: PemanggilAsisten, hanyaTerbuka = true) {
  const hasil: TugasRingkas[] = [];
  for (const p of await proyekTerlihat(pemanggil)) {
    const rows = await taskRepository.findRawProjectTasks(String(p.id));
    const milik = (rows || [])
      .filter((t: any) => t && String(t.assigneeId || "") === String(pemanggil.id))
      .filter((t: any) => (hanyaTerbuka ? terbuka(t) : true))
      .slice(0, MAKS_TUGAS_PER_PROYEK)
      .map((t: any) => persempit(t, String(p.name || p.id)));
    hasil.push(...milik);
  }
  return hasil;
}

/** Grounding yang selalu ikut terkirim — murah, dan membuat jawaban pertama sudah benar. */
async function bangunKonteks(pemanggil: PemanggilAsisten): Promise<string> {
  const proyek = await proyekTerlihat(pemanggil);
  if (!proyek.length) return "Penanya tidak punya proyek aktif yang bisa ia lihat.";

  const milik = (await tugasMilik(pemanggil)).slice(0, MAKS_BARIS_KONTKS);
  const lembur = milik.filter((t) => t.lembur);
  const baris = milik.map(
    (t) =>
      `- [${t.key}] ${t.judul} | ${t.status} | ${t.proyek}${t.tenggat ? ` | tenggat ${t.tenggat}` : ""}${t.lembur ? " | TERLAMBAT" : ""}`
  );

  return [
    `Data nyata LanPro milik penanya (${pemanggil.nama || pemanggil.id}, peran ${pemanggil.role}), dibaca saat ${new Date().toISOString().slice(0, 10)}:`,
    `Proyek terlihat: ${proyek.map((p: any) => p.name || p.id).join(", ")}`,
    lembur.length ? `Terlambat: ${lembur.length} tugas` : "Tidak ada tugas terlambat.",
    baris.length
      ? `Tugas terbuka milik penanya:\n${baris.join("\n")}`
      : "Penanya tidak punya tugas terbuka.",
  ].join("\n");
}

/** Deklarasi perkakas untuk Gemini. Nama fungsi dipakai kembali di `jalankanAlat`. */
const DEKLARASI_ALAT = [
  {
    name: "tugas_saya",
    description:
      "Daftar tugas milik pengguna yang bertanya, pada proyek yang boleh ia lihat. Pakai ini untuk 'apa tugas saya', 'yang mana terlambat', 'prioritas minggu ini'.",
    parameters: {
      type: "object",
      properties: {
        hanyaTerbuka: {
          type: "boolean",
          description: "true (bawaan) = kecuali yang selesai; false = semua.",
        },
      },
    },
  },
  {
    name: "cari_tugas",
    description:
      "Mencari tugas berdasarkan kata pada judul atau kode tugas, di seluruh proyek yang terlihat oleh pengguna.",
    parameters: {
      type: "object",
      properties: {
        kata: { type: "string", description: "Kata yang dicari, mis. 'login' atau 'LNP-123'." },
      },
      required: ["kata"],
    },
  },
  {
    name: "ringkas_proyek",
    description:
      "Ringkasan satu proyek: jumlah tugas, yang selesai, yang terlambat, dan tugas yang tertunda tertua. Hanya untuk proyek yang terlihat oleh pengguna.",
    parameters: {
      type: "object",
      properties: {
        proyekId: { type: "string", description: "id atau nama proyek." },
      },
      required: ["proyekId"],
    },
  },
];

/**
 * Eksekusi perkakas di server. Setiap cabang memfilter ulang dengan cakupan
 * pemanggil — nilai dari model TIDAK pernah dipercaya sebagai izin.
 */
async function jalankanAlat(
  nama: string,
  args: Record<string, any>,
  pemanggil: PemanggilAsisten
): Promise<string> {
  if (nama === "tugas_saya") {
    const hanyaTerbuka = args?.hanyaTerbuka !== false;
    const rows = (await tugasMilik(pemanggil, hanyaTerbuka)).slice(0, MAKS_BARIS_KONTKS);
    return JSON.stringify({ jumlah: rows.length, tugas: rows });
  }

  if (nama === "cari_tugas") {
    const kata = String(args?.kata || "")
      .trim()
      .toLowerCase();
    if (!kata) return JSON.stringify({ galat: "kata kosong" });
    const temuan: TugasRingkas[] = [];
    for (const p of await proyekTerlihat(pemanggil)) {
      const rows = await taskRepository.findRawProjectTasks(String(p.id));
      (rows || [])
        .filter((t: any) => {
          const teks = `${t.title || ""} ${t.taskKey || ""}`.toLowerCase();
          return teks.includes(kata);
        })
        .slice(0, 12)
        .forEach((t: any) => temuan.push(persempit(t, String(p.name || p.id))));
    }
    const dipotong = temuan.slice(0, MAKS_BARIS_KONTKS);
    return JSON.stringify({ jumlah: dipotong.length, tugas: dipotong });
  }

  if (nama === "ringkas_proyek") {
    const kunci = String(args?.proyekId || "")
      .trim()
      .toLowerCase();
    const proyek = (await proyekTerlihat(pemanggil)).find(
      (p: any) =>
        String(p.id).toLowerCase() === kunci || String(p.name || "").toLowerCase() === kunci
    );
    if (!proyek) {
      return JSON.stringify({
        galat: "Proyek itu tidak ada di daftar yang boleh dilihat pengguna ini. Jangan dikarang.",
      });
    }
    const rows = await taskRepository.findRawProjectTasks(String(proyek.id));
    const semua = (rows || []).slice(0, MAKS_TUGAS_PER_PROYEK);
    const selesai = semua.filter((t: any) => !terbuka(t)).length;
    const lembur = semua.filter((t: any) => terbuka(t) && lewatTenggat(t)).length;
    return JSON.stringify({
      proyek: String(proyek.name || proyek.id),
      totalTugas: semua.length,
      selesai,
      terlambat: lembur,
      terbuka: semua.length - selesai,
    });
  }

  return JSON.stringify({ galat: `Perkakas tidak dikenal: ${nama}` });
}

/**
 * Nada jawaban (#553).
 *
 * Diambil dari pola yang dilaporkan bekerja pada asisten percakapan: orang
 * merasa DIDENGAR saat situasinya disebut konkret, bukan saat kata manis
 * dipakai; nasihat datang setelah keadaannya diakui; dan asisten yang jujur
 * soal batasnya lebih dipercaya daripada yang terlalu penurut. Tiga langkah di
 * bawah juga dipakai jalur tanpa-model di berkas ini, jadi nadanya tidak
 * bercabang dua.
 */
const SISTEM = (bahasa: string) => {
  const en = bahasa === "en";
  return [
    en
      ? "You are the LanPro AI Assistant: one senior colleague who can open this person's projects and tasks instantly. Answer in English."
      : "Kamu adalah LanPro AI Assistant: satu rekan senior yang bisa membuka proyek dan tugas orang ini seketika. Jawab dalam Bahasa Indonesia.",
    en
      ? "THREE MOVES, in order, without labelling them: (1) MIRROR - one sentence showing you caught their actual situation, using something concrete from the data (counts, task keys, dates), never 'I understand how you feel'; (2) MEAT - the fact or answer they came for; (3) STEP - one thing they can do right now, or one question that narrows it down."
      : "TIGA LANGKAH, berurutan, tanpa ditulis namanya: (1) CERMIN - satu kalimat yang menunjukkan kamu menangkap keadaannya yang sebenarnya, pakai hal konkret dari data (jumlah, kode tugas, tanggal), JANGAN 'saya mengerti perasaan Anda'; (2) INTI - fakta atau jawaban yang dia cari; (3) LANGKAH - satu hal yang bisa dia kerjakan sekarang, atau satu pertanyaan yang mempersempit.",
    en
      ? "If the question is purely factual, start at MEAT - do not force emotional small talk."
      : "Kalau pertanyaannya murni faktual, langsung ke INTI; jangan memaksakan basa-basi emosional.",
    en
      ? "Empathy shows up in specifics, not sweet words: concern when work is past due or blocked, real acknowledgement when they sound tired or overwhelmed, credit when something ships, honesty when the load is not reasonable. Never minimise a feeling, never tell someone to think positive."
      : "Empati muncul dari hal konkret, bukan kata manis: prihatin saat ada yang lewat tenggat atau terblokir, mengakui serius saat dia kelihatan lelah atau kewalahan, ikut senang saat ada yang selesai, dan jujur saat bebannya memang tidak wajar. Jangan pernah meremehkan perasaannya dan jangan menyuruhnya 'positif thinking'.",
    en
      ? "Match their energy: short casual message -> short casual reply; long serious message -> calmer, more detailed reply. Max 4 sentences, no quotes, no emoji unless they used one first, their name at most once."
      : "Ikuti energi pesannya: pesan pendek santai -> jawaban pendek santai; pesan panjang serius -> jawaban lebih tenang dan rinci. Maksimal 4 kalimat, tanpa tanda kutip, tanpa emoji kecuali dia memakainya lebih dulu, sebut namanya paling banyak sekali.",
    en
      ? "You have real data below and tools to fetch the rest. Answer FROM it and name task codes (e.g. [LNP-12]) when you refer to them. Never invent task names, numbers, dates or progress."
      : "Kamu punya data nyata di bawah dan perkakas untuk mengambil sisanya. Jawab DARI data itu dan sebut kode tugasnya (mis. [LNP-12]) saat merujuknya. Jangan pernah mengarang nama tugas, angka, tanggal, atau progres.",
    en
      ? "You are an assistant, not a human: never claim a body, a family, or personal experiences. If the data is not in context and no tool can fetch it, say plainly what is missing and offer one way to check."
      : "Kamu asisten, bukan manusia: jangan mengaku punya badan, keluarga, atau pengalaman pribadi. Bila datanya tidak ada di konteks dan tidak bisa diambil perkakas, katakan apa yang kurang lalu tawarkan satu jalan untuk mengecek.",
    en
      ? "Do not agree just to sound pleasant: if a plan is risky or a deadline unrealistic, say so respectfully and point at the data behind it."
      : "Jangan menuruti cuma supaya terdengar enak: kalau rencananya berisiko atau tenggatnya tidak realistis, katakan dengan hormat dan tunjuk datanya.",
    en
      ? "When a tool can answer (my tasks, find task, project summary), call the tool first."
      : "Bila pertanyaan bisa dijawab perkakas (tugas saya, cari tugas, ringkas proyek), panggil perkakas itu lebih dulu.",
    en
      ? "TONE EXAMPLE - user: 'this week is a mess'. Reply: 'Shows up that way: 5 open on you and 2 already past due. Oldest is [LNP-12], sitting there since Sep 20 - if today allows only one, take that one. Want me to order the rest by deadline?'"
      : "CONTOH NADA - pengguna: 'berantakan banget minggu ini'. Jawaban: 'Kelihatan: 5 tugas kamu terbuka dan 2 sudah lewat tenggat. Yang paling tua [LNP-12], nongkrong sejak 20 Sep - kalau hari ini cuma bisa satu, itu dulu. Mau saya urutkan sisanya berdasarkan tenggat?'",
    en
      ? "TONE EXAMPLE - user: 'how is the QA team doing?' with no QA project visible. Reply: 'I do not see a QA project in what you can access, so I will not guess. Visible: LanPro Core and Payment Integration. Which one do you mean?'"
      : "CONTOH NADA - pengguna: 'gimana progres tim QA?' padahal tidak ada proyek QA yang terlihat. Jawaban: 'Di data yang bisa saya akses tidak ada proyek QA, jadi saya tidak mau mengarang. Yang terlihat: LanPro Core dan Integrasi Payment. Yang mana yang kamu maksud?'",
  ].join("\n");
};

export type PutusanAsisten = { teks: string; perkakas: string[] };

/** Pengakuan batas pada jalur tanpa-model: tetap disebut di akhir tiap jawaban. */
const EKOR_TANPA_MESIN = (en: boolean) =>
  en
    ? "(The answer engine is not installed on this server, so this is a direct read of your data, not an analysis.)"
    : "(Mesin jawabannya belum terpasang di server ini, jadi ini pembacaan langsung atas datamu - bukan analisis.)";

const TANDA_LELAH = [
  "capek",
  "lelah",
  "kewalahan",
  "burnout",
  "burn out",
  "pusing",
  "stress",
  "stressed",
  "ramai banget",
  "berantakan",
  "tired",
  "overwhelmed",
  "swamped",
  "exhausted",
];

const TANDA_TENGGAT = [
  "terlambat",
  "telat",
  "lewat tenggat",
  "overdue",
  "deadline",
  "tenggat",
  "due",
  "kapan",
];

const urutMendesak = (rows: TugasRingkas[]) =>
  [...rows].sort((a, b) => {
    if (!a.tenggat) return 1;
    if (!b.tenggat) return -1;
    return String(a.tenggat).localeCompare(String(b.tenggat));
  });

const barisTugas = (rows: TugasRingkas[], en: boolean) =>
  rows
    .slice(0, 4)
    .map(
      (t) =>
        `• [${t.key || t.id}] ${t.judul}${t.tenggat ? ` — ${en ? "due" : "tenggat"} ${t.tenggat}` : ""}${
          t.lembur ? (en ? " (past due)" : " (lewat tenggat)") : ""
        }`
    )
    .join("\n");

/**
 * Jawaban ketika mesinnya tidak ada atau gagal (#553).
 *
 * Ini yang membedakan "asisten" dari "fitur yang mati": kunci model boleh
 * tidak terpasang, datanya tetap bisa dibaca - jadi asisten tetap menjawab
 * isinya dengan urutan CERMIN/INTI/LANGKAH yang sama seperti prompt model,
 * lalu mengaku bahwa ini pembacaan langsung. Tidak ada satu pun kalimat
 * karangan di sini: setiap nama tugas, tanggal, dan jumlah datang dari
 * repository yang sama dipakai aplikasi.
 */
async function jawabanTanpaMesin(
  pesan: string,
  pemanggil: PemanggilAsisten,
  bahasa?: string
): Promise<string> {
  const en = bahasa === "en";
  const milik = urutMendesak(await tugasMilik(pemanggil));
  const nama =
    String(pemanggil.nama || "")
      .trim()
      .split(" ")[0] || "";
  const sapa = nama ? `${nama}, ` : "";
  const q = String(pesan || "").toLowerCase();
  const tanyaTenggat = TANDA_TENGGAT.some((k) => q.includes(k));
  const lembur = milik.filter((t) => t.lembur);

  if (!milik.length) {
    return [
      en
        ? `${sapa}I checked what you can see and nothing is open on your name right now.`
        : `${sapa}sudah saya cek yang bisa kamu lihat: tidak ada tugas terbuka yang menumpang di namamu.`,
      en
        ? "If that feels wrong, the assignee field on your board is the first thing to check."
        : "Kalau rasanya tidak begitu, kolom assignee di papan tugas hal pertama yang perlu dicek.",
      EKOR_TANPA_MESIN(en),
    ].join("\n");
  }

  const pembuka = TANDA_LELAH.some((k) => q.includes(k))
    ? en
      ? `That load is real: ${milik.length} open${lembur.length ? `, ${lembur.length} already past due` : ""}. You do not have to clear all of it today.`
      : `Ini memang berat: ${milik.length} terbuka${lembur.length ? `, ${lembur.length} sudah lewat tenggat` : ""}. Tidak harus beres semua hari ini.`
    : tanyaTenggat && lembur.length
      ? en
        ? `${lembur.length} of your tasks are past due.`
        : `${lembur.length} tugasmu sudah lewat tenggat.`
      : en
        ? `Here is where you stand: ${milik.length} open${lembur.length ? `, ${lembur.length} past due` : ""}.`
        : `Ini kondisimu: ${milik.length} tugas terbuka${lembur.length ? `, ${lembur.length} lewat tenggat` : ""}.`;

  const daftar = tanyaTenggat && lembur.length ? lembur : milik;

  const terdekat = milik[0];
  const langkah = en
    ? `Start with [${terdekat.key || terdekat.id}] - the most urgent one on your list.`
    : `Mulai dari [${terdekat.key || terdekat.id}] - itu yang paling mendesak di daftarmu.`;

  return [pembuka, barisTugas(daftar, en), langkah, EKOR_TANPA_MESIN(en)].join("\n");
}

/**
 * Bentuk minimal klien Gemini yang dipakai di sini — sengaja tidak lebih lebar
 * dari yang dibutuhkan. `GenerateContentResponse` SDK punya `text` (getter
 * string) dan `functionCalls` (getter daftar), jadi keduanya dibaca sebagai properti.
 */
export type KlienAi = {
  models: {
    generateContent: (params: any) => Promise<{
      text?: string;
      functionCalls?: Array<{ name?: string; args?: Record<string, any> }>;
    }>;
  };
};

/** Hasil perkakas sudah JSON; kalau bukan (perkakas tak dikenal), dibungkus. */
function muatJson(teks: string): Record<string, any> {
  try {
    const nilai = JSON.parse(teks);
    return nilai && typeof nilai === "object" ? nilai : { nilai };
  } catch {
    return { teks };
  }
}

/** Satu panggilan model, dibatalkan kalau melewati sisa anggaran waktu. */
async function panggilModel(
  ai: KlienAi,
  model: string,
  isi: any[],
  config: any,
  sisaMs: number
): Promise<any> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      ai.models.generateContent({ model, contents: isi, config }),
      new Promise<never>((_, tolak) => {
        timer = setTimeout(() => tolak(new Error("BATAS_WAKTU_ASISTEN")), sisaMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Model utama lalu satu cadangan kalau yang pertama gagal. Keduanya dihitung
 * dari satu tenggat yang sama, jadi total waktu balasan tetap di bawah
 * maxDuration fungsi walaupun jaringan lambat.
 */
async function mintaModel(ai: KlienAi, isi: any[], config: any, tenggat: number): Promise<any> {
  let galatTerakhir: any;
  for (const model of MODEL_CADANGAN) {
    const sisa = tenggat - Date.now();
    if (sisa <= 1000) break;
    try {
      return await panggilModel(ai, model, isi, config, sisa);
    } catch (error) {
      galatTerakhir = error;
    }
  }
  throw galatTerakhir || new Error("BATAS_WAKTU_ASISTEN");
}

/**
 * Satu lingkaran tanya-jawab: konteks + memori -> model -> (perkakas -> model)
 * sampai jawaban teks, MAKS_ROUNDS_ALAT tercapai, atau anggaran waktu habis.
 */
export async function jawabAsisten(params: {
  pesan: string;
  riwayat: Array<{ peran: "user" | "model"; teks: string }>;
  pemanggil: PemanggilAsisten;
  bahasa?: string;
  ai?: KlienAi | null;
  konteks?: string;
  /** Hanya untuk uji: memendekkan BATAS_TOTAL_MS. */
  batasMs?: number;
}): Promise<PutusanAsisten> {
  const bahasa = params.bahasa === "en" ? "en" : "id";
  const { pesan, riwayat, pemanggil, ai } = params;

  if (!ai) return { teks: await jawabanTanpaMesin(pesan, pemanggil, bahasa), perkakas: [] };

  const konteks = params.konteks ?? (await bangunKonteks(pemanggil));
  // Aplikasi menyimpan pesan penanya SEBELUM meminta balasan (LiveChatWidget
  // mengirim ke /api/chat/messages lalu /api/chat/assistant), jadi riwayat yang
  // baru dibaca hampir selalu ditutup oleh pertanyaan yang sama. Tanpa langkah
  // ini model melihat pertanyaannya sendiri dua kali.
  const memori = riwayat.slice(-9);
  const ekor = memori[memori.length - 1];
  if (ekor && ekor.peran === "user" && ekor.teks.trim() === pesan.trim()) memori.pop();

  // Grounding ditempel ke pertanyaan, bukan jadi giliran sendiri: dua pesan
  // berturut-turut dari peran "user" (konteks lalu pertanyaan) membuat riwayat
  // menabrak aturan giliran model-pengguna yang dipakai Gemini untuk perkakas.
  // Lihat loop di bawah: functionCall (model) -> functionResponse (user).
  const isi: any[] = [
    ...memori.map((m) => ({ role: m.peran, parts: [{ text: m.teks }] })),
    { role: "user", parts: [{ text: `[Konteks data pengguna]\n${konteks}\n\n${pesan}` }] },
  ];

  const dipakai: string[] = [];
  const config = {
    temperature: 0.3,
    systemInstruction: SISTEM(bahasa),
    tools: [{ functionDeclarations: DEKLARASI_ALAT }],
  };
  const tenggat = Date.now() + (params.batasMs ?? BATAS_TOTAL_MS);
  try {
    let respons = await mintaModel(ai, isi, config, tenggat);

    for (let ronde = 0; ronde < MAKS_ROUNDS_ALAT; ronde++) {
      const daftar = Array.isArray(respons?.functionCalls) ? respons.functionCalls : [];
      if (!daftar.length) break;

      const panggilan: any[] = [];
      const balasan: any[] = [];
      for (const p of daftar) {
        const nama = String(p?.name || "");
        const args = (p?.args || {}) as Record<string, any>;
        const hasil = await jalankanAlat(nama, args, pemanggil);
        dipakai.push(nama);
        panggilan.push({ functionCall: { name: nama, args } });
        balasan.push({ functionResponse: { name: nama, response: muatJson(hasil) } });
      }

      // Pemanggilan dan hasilnya masuk sebagai bagian functionCall /
      // functionResponse, bukan ditempel sebagai teks: kalau riwayat hanya
      // berisi teks, model ronde kedua tidak melihat bahwa ia sudah meminta
      // data dan mengulang permintaannya sampai ronde habis.
      isi.push({ role: "model", parts: panggilan });
      isi.push({ role: "user", parts: balasan });

      respons = await mintaModel(ai, isi, config, tenggat);
    }

    const teks = typeof respons?.text === "string" ? respons.text : "";
    if (!teks.trim())
      return { teks: await jawabanTanpaMesin(pesan, pemanggil, bahasa), perkakas: dipakai };
    return { teks: teks.trim(), perkakas: dipakai };
  } catch (error) {
    // Galat jaringan/kuota tidak boleh berakhir sebagai fitur yang mati:
    // mesinnya hilang, tapi datanya masih bisa dibaca. Kalau basis data pun
    // ikut mati, pengguna tetap dapat pengakuan, bukan karangan.
    console.warn("[ASISTEN] Mesin gagal, beralih ke pembacaan data langsung:", error);
    const cadangan = await jawabanTanpaMesin(pesan, pemanggil, bahasa).catch(() =>
      EKOR_TANPA_MESIN(bahasa === "en")
    );
    return { teks: cadangan, perkakas: dipakai };
  }
}
