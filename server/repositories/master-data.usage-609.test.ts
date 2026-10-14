/**
 * #609 — gerbang "data master sedang digunakan" harus tetap bisa menghitung
 * pemakaian sesudah `Tasks.type` pindah dari label ke `code`.
 *
 * Sebelum perbaikan `countTaskUsage` membandingkan `type = <label>` persis,
 * jadi baris lama (`"sub-task"`) dan baris baru (`"subtask"`) sama-sama lolos
 * dari hitungan: admin bisa menghapus baris `issue_type` yang paling terpakai
 * tanpa peringatan apa pun.
 */
import fs from "node:fs";
import path from "node:path";

import db from "../../src/lib/db";
import { masterDataRepository } from "./master-data.repository";

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: { getConnection: jest.fn() },
}));

const query = jest.fn();
const release = jest.fn();

beforeEach(() => {
  query.mockReset();
  release.mockReset();
  (db.getConnection as jest.Mock).mockResolvedValue({ query, release });
});

describe("#609 countTaskUsage", () => {
  it("membandingkan kolom type dalam bentuk kanonik, bukan label persis", async () => {
    query.mockResolvedValue([[{ count: "3" }]]);
    const hasil = await masterDataRepository.countTaskUsage("Sub-task", "subtask");
    expect(hasil).toBe(3);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("REGEXP_REPLACE(LOWER(COALESCE(type, '')), '[^a-z0-9]', '', 'g')");
    expect(sql).not.toContain("OR type = ?");
    // status/priority/environment tetap dibandingkan apa adanya — di luar #609.
    expect(sql).toContain("status = ? OR priority = ? OR environment = ?");
    expect(params).toEqual(["Sub-task", "Sub-task", "Sub-task", "subtask", "subtask"]);
    expect(release).toHaveBeenCalled();
  });

  it("menghitung baris lama (label) DAN baris baru (code)", async () => {
    query.mockResolvedValue([[{ count: "7" }]]);
    await masterDataRepository.countTaskUsage("Sub-task", "subtask");
    const [, params] = query.mock.calls[0];
    // Bentuk ternormalisasi dari label "Sub-task" sama dengan code "subtask".
    expect(params[3]).toBe("subtask");
    expect(params[4]).toBe("subtask");
  });

  it("tanpa code (baris master lama) tidak membuatnya cocok dengan type kosong", async () => {
    query.mockResolvedValue([[{ count: "0" }]]);
    await masterDataRepository.countTaskUsage("Sub-task", null);
    const [, params] = query.mock.calls[0];
    // Bukan string kosong: placeholder kedua diisi ulang dengan bentuk label,
    // jadi task bertipe '' tidak ikut terhitung sebagai pemakaian.
    expect(params[3]).toBe("subtask");
    expect(params[4]).toBe("subtask");
  });

  it("code yang huruf besar-kecilnya berbeda tetap dikenali", async () => {
    query.mockResolvedValue([[{ count: "1" }]]);
    await masterDataRepository.countTaskUsage("Bug Kritis", "BugKritis");
    const [, params] = query.mock.calls[0];
    expect(params[3]).toBe("bugkritis");
    expect(params[4]).toBe("bugkritis");
  });

  it("melepas koneksi walau query gagal", async () => {
    query.mockRejectedValue(new Error("koneksi putus"));
    await expect(masterDataRepository.countTaskUsage("Bug", "bug")).rejects.toThrow(
      "koneksi putus"
    );
    expect(release).toHaveBeenCalled();
  });
});

describe("#609 rute hapus mengirim code untuk issue_type", () => {
  it("master-data.routes.ts meneruskan code hanya pada baris issue_type", () => {
    const sumber = fs.readFileSync(
      path.join(__dirname, "..", "routes", "master-data.routes.ts"),
      "utf8"
    );
    expect(sumber).toContain('item.type === "issue_type" ? item.code : null');
    expect(sumber).not.toContain("countTaskUsage(item.label)");
  });
});
