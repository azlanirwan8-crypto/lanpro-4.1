/**
 * #354 — SoD tipis: perubahan status akun diblok untuk akun sendiri,
 * dan hanya admin yang boleh mengubah status.
 */
import fs from "node:fs";
import path from "node:path";

const sumber = fs.readFileSync(path.join(__dirname, "user.routes.ts"), "utf8");

describe("#354 SoD status akun", () => {
  it("rute PUT /api/users/:id menolak ubah status akun sendiri", () => {
    expect(sumber).toContain("srv.tidak_bisa_ubah_status_akun_sendiri");
    expect(sumber).toContain("srv.akses_ditolak_status_hanya_admin");
  });

  it("pemeriksaan status ada sebelum updateUser", () => {
    const idxStatus = sumber.indexOf("srv.tidak_bisa_ubah_status_akun_sendiri");
    const idxUpdate = sumber.indexOf("await userRepository.updateUser(");
    expect(idxStatus).toBeGreaterThan(-1);
    expect(idxUpdate).toBeGreaterThan(idxStatus);
  });
});
