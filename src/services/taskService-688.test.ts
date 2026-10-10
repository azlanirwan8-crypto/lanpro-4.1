/**
 * #688 — apa yang boleh (dan tidak boleh) dikirim klien saat "My Tasks".
 *
 * `mineOnly` adalah SATU-SATUNYA hal yang dikirim: sebuah bendera. Identitas
 * pemilik tidak pernah ikut, karena kalau query string yang menentukan milik
 * siapa, siapa pun bisa membuka tugas orang lain dengan mengganti angka di
 * address bar — kelas cacat yang baru saja ditutup #674/#675 di sisi server.
 * Test ini mengunci bentuk permintaannya, supaya penambahan parameter di
 * kemudian hari tidak diam-diam memindahkan keputusan ke klien.
 */
jest.mock("../lib/api", () => ({
  __esModule: true,
  apiRequest: jest.fn(),
}));

import { apiRequest } from "../lib/api";
import { fetchTasks } from "./taskService";

const dipanggil = (options?: any) => {
  fetchTasks("proj-1", options);
  return String((apiRequest as jest.Mock).mock.calls[0][0]);
};

describe("#688 parameter mineOnly di daftar task", () => {
  beforeEach(() => {
    (apiRequest as jest.Mock).mockResolvedValue({ items: [] });
  });

  it("tanpa bendera: tidak ada mineOnly di URL", () => {
    expect(dipanggil({ page: 1, limit: 25 })).toBe("/api/projects/proj-1/tasks?page=1&limit=25");
  });

  it("mineOnly=true mengirim bendera, dan hanya bendera", () => {
    const url = dipanggil({ page: 1, mineOnly: true });
    expect(url).toContain("mineOnly=1");
    expect(url).not.toContain("assignee");
    expect(url).not.toContain("email");
    expect(url).not.toContain("uid");
  });

  it("mineOnly=false identik dengan tidak dikirim", () => {
    expect(dipanggil({ page: 1, mineOnly: false })).toBe(dipanggil({ page: 1 }));
  });

  it("tetap bekerja untuk daftar root yang di-page server (Issue List)", () => {
    const url = dipanggil({ page: 2, limit: 25, rootsOnly: true, mineOnly: true, search: "login" });
    expect(url).toContain("rootsOnly=1");
    expect(url).toContain("mineOnly=1");
    expect(url).toContain("search=login");
    expect(url).toContain("page=2");
  });
});
