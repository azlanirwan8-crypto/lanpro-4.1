/**
 * #661 — gerbang `audit:label` R2 mengenali pemotong teks yang dulu lolos.
 *
 * R2 hanya mencari `truncate` yang berpasangan `max-w-[NNpx]` pada satu baris.
 * Akibatnya terukur, bukan dikhawatirkan: angka R2 bergerak 31 → 28 → 20 seiring
 * orang menukar `truncate` dengan resep lain yang memotong teks sama pastinya —
 * `line-clamp-2`, `text-ellipsis`, `textOverflow` inline, atau
 * `overflow-hidden` + `whitespace-nowrap`. Gerbangnya hijau, teksnya tetap
 * hilang. Sesudah diperlebar, R2 melihat 43 situs di 27 berkas, bukan 16.
 *
 * Test ini menjalankan gerbangnya SUNGGUHAN terhadap fixture di direktori
 * sementara DI LUAR repo (`--akar`), karena §0.5 melarang menyabotase sumber
 * demi membuktikan sebuah gerbang bisa merah. Yang diuji dua arah: pola baru
 * harus MERAH, dan `overflow-hidden` sendirian harus tetap HIJAU — ia juga
 * dipakai membulatkan sudut wadah, dan menghitungnya akan menggemukkan garis
 * dasar sampai gerbangnya mati rasa.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const SKRIP = path.resolve(__dirname, "../../scripts/validate/audit-label.cjs");
const dibuat: string[] = [];

const fixture = (isiTsx: string) => {
  const akar = fs.mkdtempSync(path.join(os.tmpdir(), "gerbang-label-661-"));
  dibuat.push(akar);
  fs.mkdirSync(path.join(akar, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(akar, "src", "Dummy.tsx"),
    ["export const Dummy = () => (", "  <div>", isiTsx, "  </div>", ");", ""].join("\n")
  );
  return akar;
};

const jalankan = (akar: string) => {
  const r = spawnSync("node", [SKRIP, "--akar", akar], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return { status: r.status, keluar: `${r.stdout || ""}${r.stderr || ""}` };
};

const merah = (keluar: string) => {
  expect(keluar).toMatch(/R2 BARU\/NAIK src[\\/]Dummy\.tsx/);
};

afterAll(() => {
  for (const d of dibuat) fs.rmSync(d, { recursive: true, force: true });
});

describe("#661 — pola pemotong yang dulu lolos kini dikenali R2", () => {
  it("line-clamp-N merah", () => {
    const { status, keluar } = jalankan(
      fixture('    <p className="line-clamp-2 text-xs">{judul}</p>')
    );
    expect(status).toBe(1);
    merah(keluar);
  });

  it("text-ellipsis merah", () => {
    const { status, keluar } = jalankan(
      fixture('    <span className="text-ellipsis max-w-40">{nama}</span>')
    );
    expect(status).toBe(1);
    merah(keluar);
  });

  it("textOverflow inline merah", () => {
    const { status, keluar } = jalankan(
      fixture('    <span style={{ textOverflow: "ellipsis" }}>{nama}</span>')
    );
    expect(status).toBe(1);
    merah(keluar);
  });

  it("overflow-hidden + whitespace-nowrap merah, apa pun urutannya", () => {
    for (const kelas of [
      "overflow-hidden whitespace-nowrap max-w-[220px]",
      "max-w-[220px] whitespace-nowrap overflow-hidden",
    ]) {
      const { status, keluar } = jalankan(fixture(`    <div className="${kelas}">{isi}</div>`));
      expect(status).toBe(1);
      merah(keluar);
    }
  });

  it("pola lama truncate + max-w-[NNpx] tetap merah", () => {
    const { status, keluar } = jalankan(
      fixture('    <div className="truncate max-w-[320px]">{judul}</div>')
    );
    expect(status).toBe(1);
    merah(keluar);
  });

  it("overflow-hidden sendirian TIDAK dihitung: wadah sudut membulat bukan pemotong", () => {
    const { status, keluar } = jalankan(
      fixture('    <div className="overflow-hidden rounded-xl border">{isi}</div>')
    );
    expect(status).toBe(0);
    expect(keluar).toMatch(/LULUS/);
  });

  it("max-w-[...] sendirian TIDAK dihitung: teksnya masih boleh turun baris", () => {
    const { status } = jalankan(fixture('    <p className="max-w-[320px] text-xs">{isi}</p>'));
    expect(status).toBe(0);
  });
});
