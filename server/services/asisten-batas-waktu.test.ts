/**
 * #554 — satu pesan asisten tidak boleh lebih lambat dari anggaran waktunya.
 *
 * Yang diukur di sini adalah PERILAKU SAAT MESINNYA LAMBAT, karena itu kondisi
 * yang membuat pengguna merasa fiturnya mati: fungsi punya maxDuration 30 detik
 * (vercel.json:14) dan rantai lima model dengan retry jaringan bisa memakan
 * 18,1 detik PER panggilan (terukur), sementara asisten memanggil model sampai
 * empat kali dalam satu giliran.
 */

jest.mock("../repositories/project.repository", () => ({
  projectRepository: { findProjectsForCaller: jest.fn() },
}));
jest.mock("../repositories/task.repository", () => ({
  taskRepository: { findRawProjectTasks: jest.fn() },
}));

import { projectRepository } from "../repositories/project.repository";
import { taskRepository } from "../repositories/task.repository";
import { jawabAsisten, type KlienAi } from "../services/asisten";

const TUGAS = {
  id: "t-1",
  taskKey: "LNP-12",
  title: "Perbaiki navbar Safari",
  status: "In Progress",
  endDate: "2026-09-20",
  projectId: "p-1",
  assigneeId: "user-1",
};

const PENANYA = { id: "user-1", role: "developer", nama: "Alice" };

const klien = (perilaku: (model: string, ke: number) => any): KlienAi => {
  let hitungan = 0;
  const dipanggil: string[] = [];
  const ai = {
    models: {
      generateContent: (params: any) => {
        dipanggil.push(params.model);
        hitungan += 1;
        return perilaku(params.model, hitungan);
      },
    },
  };
  return Object.assign(ai, { dipanggil }) as unknown as KlienAi;
};

const daftarPanggilan = (ai: KlienAi) => (ai as any).dipanggil as string[];

describe("jawabAsisten — anggaran waktu (#554)", () => {
  beforeEach(() => {
    (projectRepository.findProjectsForCaller as jest.Mock).mockResolvedValue([
      { id: "p-1", name: "LanPro Core" },
    ] as any);
    (taskRepository.findRawProjectTasks as jest.Mock).mockResolvedValue([TUGAS] as any);
  });

  it("model yang menggantung tidak menahan balasan", async () => {
    const ai = klien(() => new Promise(() => {}));
    const mulai = Date.now();

    const putusan = await jawabAsisten({
      pesan: "Tugas saya apa?",
      riwayat: [],
      pemanggil: PENANYA,
      ai,
      batasMs: 2500,
    });

    const detik = Date.now() - mulai;
    expect(putusan.teks).toContain("LNP-12");
    expect(detik).toBeLessThan(4500);
    // Tenggat dipakai bersama: model pertama yang menggantung menghabiskan
    // anggaran, jadi cadangan TIDAK dicoba lagi — pengguna sudah dijawab.
    expect(daftarPanggilan(ai)).toEqual(["gemini-flash-latest"]);
  }, 20000);

  it("model utama gagal, cadangan yang menjawab", async () => {
    const ai = klien((model, ke) =>
      ke === 1
        ? Promise.reject(new Error("503 high demand"))
        : Promise.resolve({ text: "Satu tugas terbuka: LNP-12.", functionCalls: undefined })
    );

    const putusan = await jawabAsisten({
      pesan: "Tugas saya apa?",
      riwayat: [],
      pemanggil: PENANYA,
      ai,
      batasMs: 5000,
    });

    expect(putusan.teks).toBe("Satu tugas terbuka: LNP-12.");
    expect(daftarPanggilan(ai)).toEqual(["gemini-flash-latest", "gemini-flash-lite-latest"]);
  });

  it("dua-duanya gagal tetap memberi jawaban berbasis data", async () => {
    const ai = klien(() => Promise.reject(new Error("API key not valid")));

    const putusan = await jawabAsisten({
      pesan: "yang telat apa?",
      riwayat: [],
      pemanggil: PENANYA,
      ai,
      batasMs: 5000,
    });

    expect(putusan.teks).toContain("LNP-12");
    expect(putusan.teks).toContain("lewat tenggat");
    expect(putusan.perkakas).toEqual([]);
  });

  it("ronde perkakas berhenti di tiga dan tidak pernah melewati tenggat", async () => {
    // Model minta perkakas terus-menerus: tanpa batas, lingkaran ini bisa
    // memanggil model 4 x 18 detik.
    const ai = klien(() =>
      Promise.resolve({
        functionCalls: [{ name: "tugas_saya", args: {} }],
        text: undefined,
      })
    );

    const mulai = Date.now();
    const putusan = await jawabAsisten({
      pesan: "Tugas saya apa?",
      riwayat: [],
      pemanggil: PENANYA,
      ai,
      batasMs: 4000,
    });

    expect(daftarPanggilan(ai).length).toBeLessThanOrEqual(4);
    expect(putusan.perkakas.length).toBeGreaterThan(0);
    expect(putusan.teks).toContain("LNP-12");
    expect(Date.now() - mulai).toBeLessThan(6000);
  });
});
