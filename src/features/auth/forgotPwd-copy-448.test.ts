/**
 * #448 — copy forgotPwd memakai kata sandi sementara (bukan tautan 15 menit).
 */
import { id } from "../../i18n/locales/id";
import { en } from "../../i18n/locales/en";

describe("forgotPwd copy #448", () => {
  it("ID dan EN menyebut kata sandi sementara / temporary password, bukan tautan 15 menit", () => {
    expect(id.forgotPwd.fpIntro.toLowerCase()).toMatch(/kata sandi sementara/);
    expect(id.forgotPwd.fpIntro).not.toMatch(/tautan.*15 menit/i);
    expect(id.forgotPwd.sendLink.toLowerCase()).toMatch(/sandi/);

    expect(en.forgotPwd.fpIntro.toLowerCase()).toMatch(/temporary password/);
    expect(en.forgotPwd.fpIntro).not.toMatch(/link.*15 minutes/i);
    expect(en.forgotPwd.sendLink.toLowerCase()).toMatch(/password/);
    expect(en.forgotPwd.sendLink.length).toBeLessThanOrEqual(20);
  });
});
