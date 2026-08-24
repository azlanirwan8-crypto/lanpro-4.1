/**
 * Gerbang #174 — salinan layar sambutan tidak boleh kembali menyebut "rusak".
 *
 * Dua kalimatnya dulu menyangkal kerusakan: "Tidak ada yang rusak pada
 * aplikasi ini" dan "Modul ini terkunci, bukan rusak". Menyangkal sesuatu
 * memperkenalkan gagasan itu lebih dulu — pembaca yang tadinya tidak curiga
 * aplikasinya rusak jadi punya alasan untuk curiga. Penggantinya menyatakan
 * keadaan secara positif: akunnya siap, modulnya terbuka otomatis.
 *
 * Yang dikunci di sini NIAT-nya, bukan susunan katanya persis, supaya salinan
 * masih boleh dipoles tanpa mematahkan test — tetapi tidak boleh kembali
 * berbicara dalam kosakata "rusak/broken".
 */
import { id } from "./locales/id";
import { en } from "./locales/en";

const KUNCI = ["stepAccountDesc", "lockedHint"] as const;

describe("#174 salinan layar sambutan", () => {
  it("kedua locale punya kunci yang sama dan tidak kosong", () => {
    for (const kunci of KUNCI) {
      expect(typeof id.welcome[kunci]).toBe("string");
      expect(typeof en.welcome[kunci]).toBe("string");
      expect(id.welcome[kunci].trim().length).toBeGreaterThan(0);
      expect(en.welcome[kunci].trim().length).toBeGreaterThan(0);
    }
  });

  it("tidak menyangkal kerusakan dalam bahasa mana pun", () => {
    for (const kunci of KUNCI) {
      expect(id.welcome[kunci].toLowerCase()).not.toContain("rusak");
      expect(en.welcome[kunci].toLowerCase()).not.toContain("broken");
    }
  });

  it("menyebutkan jalan keluarnya — diundang/ditambahkan ke proyek", () => {
    expect(id.welcome.stepAccountDesc.toLowerCase()).toContain("administrator");
    expect(id.welcome.lockedHint.toLowerCase()).toContain("anggota");
    expect(en.welcome.stepAccountDesc.toLowerCase()).toContain("administrator");
    expect(en.welcome.lockedHint.toLowerCase()).toContain("member");
  });
});
