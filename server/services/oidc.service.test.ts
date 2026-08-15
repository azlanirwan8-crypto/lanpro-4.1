/**
 * Test fondasi OIDC.
 *
 * Yang diuji di sini adalah bagian yang paling tidak boleh salah: penolakan
 * `id_token` yang tidak sah. Sebuah token yang lolos verifikasi berarti
 * penyerang bisa masuk sebagai siapa pun.
 *
 * Pasangan kunci RSA dibuat DI DALAM test ini dan mati bersamanya. Tidak ada
 * source yang diubah untuk keperluan pembuktian, dan tidak ada kunci yang
 * disimpan di repo.
 */
import crypto from "crypto";
import jwt from "jsonwebtoken";

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk: any = publicKey.export({ format: "jwk" });
const KID = "kunci-uji-1";
const ISSUER = "https://accounts.google.com";
const CLIENT_ID = "client-uji.apps.googleusercontent.com";
const NONCE = "nonce-uji-123";

const discoveryPalsu = {
  issuer: ISSUER,
  authorization_endpoint: ISSUER + "/o/oauth2/v2/auth",
  token_endpoint: "https://oauth2.googleapis.com/token",
  jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
};

/** Menjawab discovery & JWKS tanpa menyentuh jaringan. */
function pasangFetchPalsu() {
  global.fetch = jest.fn(async (url: any) => {
    const u = String(url);
    if (u.includes("openid-configuration")) {
      return { ok: true, json: async () => discoveryPalsu } as any;
    }
    if (u.includes("certs")) {
      return {
        ok: true,
        json: async () => ({ keys: [{ ...jwk, kid: KID, alg: "RS256" }] }),
      } as any;
    }
    throw new Error("fetch tak terduga: " + u);
  }) as any;
}

function buatIdToken(ubah: Record<string, any> = {}, opsi: jwt.SignOptions = {}) {
  return jwt.sign(
    {
      sub: "1234567890",
      email: "budi@perusahaan.com",
      email_verified: true,
      name: "Budi",
      nonce: NONCE,
      ...ubah,
    },
    privateKey,
    {
      algorithm: "RS256",
      issuer: ISSUER,
      audience: CLIENT_ID,
      expiresIn: "5m",
      keyid: KID,
      ...opsi,
    }
  );
}

describe("oidc.service", () => {
  let oidc: typeof import("./oidc.service");

  beforeEach(async () => {
    jest.resetModules();
    process.env.JWT_SECRET = "rahasia-uji-yang-cukup-panjang-untuk-lolos";
    process.env.OIDC_GOOGLE_CLIENT_ID = CLIENT_ID;
    process.env.OIDC_GOOGLE_CLIENT_SECRET = "secret-uji";
    process.env.OIDC_REDIRECT_URI = "http://localhost:3000/api/auth/oidc/callback";
    delete process.env.OIDC_MICROSOFT_CLIENT_ID;
    delete process.env.OIDC_MICROSOFT_CLIENT_SECRET;
    pasangFetchPalsu();
    oidc = await import("./oidc.service");
  });

  describe("verifikasiIdToken", () => {
    it("menerima token yang sah", async () => {
      const hasil = await oidc.verifikasiIdToken("google", buatIdToken(), NONCE);
      expect(hasil.email).toBe("budi@perusahaan.com");
      expect(hasil.emailTerverifikasi).toBe(true);
      expect(hasil.sub).toBe("1234567890");
      expect(hasil.provider).toBe("google");
    });

    it("MENOLAK token yang ditandatangani kunci lain", async () => {
      const lain = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
      const palsu = jwt.sign({ sub: "x", email: "a@b.com", nonce: NONCE }, lain, {
        algorithm: "RS256",
        issuer: ISSUER,
        audience: CLIENT_ID,
        expiresIn: "5m",
        keyid: KID,
      });
      await expect(oidc.verifikasiIdToken("google", palsu, NONCE)).rejects.toThrow();
    });

    it("MENOLAK token kedaluwarsa", async () => {
      const token = buatIdToken({}, { expiresIn: "-1s" });
      await expect(oidc.verifikasiIdToken("google", token, NONCE)).rejects.toThrow();
    });

    it("MENOLAK token dengan audience salah", async () => {
      const token = buatIdToken({}, { audience: "aplikasi-lain" });
      await expect(oidc.verifikasiIdToken("google", token, NONCE)).rejects.toThrow();
    });

    it("MENOLAK token dengan issuer salah", async () => {
      const token = buatIdToken({}, { issuer: "https://penyerang.example" });
      await expect(oidc.verifikasiIdToken("google", token, NONCE)).rejects.toThrow();
    });

    it("MENOLAK nonce yang tidak cocok", async () => {
      await expect(oidc.verifikasiIdToken("google", buatIdToken(), "nonce-lain")).rejects.toThrow(
        /Nonce/
      );
    });

    it("MENOLAK token tanpa email", async () => {
      const token = buatIdToken({ email: undefined });
      await expect(oidc.verifikasiIdToken("google", token, NONCE)).rejects.toThrow(/email/);
    });

    it("menganggap email BELUM terverifikasi bila klaimnya tidak ada", async () => {
      const token = buatIdToken({ email_verified: undefined });
      const hasil = await oidc.verifikasiIdToken("google", token, NONCE);
      expect(hasil.emailTerverifikasi).toBe(false);
    });

    it("menormalkan email menjadi huruf kecil", async () => {
      const token = buatIdToken({ email: "Budi@Perusahaan.COM" });
      const hasil = await oidc.verifikasiIdToken("google", token, NONCE);
      expect(hasil.email).toBe("budi@perusahaan.com");
    });
  });

  describe("PKCE", () => {
    it("code_challenge adalah SHA-256 base64url dari verifier", () => {
      const verifier = oidc.buatCodeVerifier();
      const challenge = oidc.hitungCodeChallenge(verifier);
      const harapan = crypto
        .createHash("sha256")
        .update(verifier)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      expect(challenge).toBe(harapan);
      expect(challenge).not.toContain("=");
    });

    it("verifier berbeda setiap kali", () => {
      expect(oidc.buatCodeVerifier()).not.toBe(oidc.buatCodeVerifier());
    });
  });

  describe("state bertanda tangan", () => {
    it("kembali utuh setelah dibaca", () => {
      const asli = {
        provider: "google" as const,
        nonce: "n1",
        codeVerifier: "v1",
        mode: "login" as const,
      };
      const hasil = oidc.bacaState(oidc.tandaTanganiState(asli));
      expect(hasil.provider).toBe("google");
      expect(hasil.nonce).toBe("n1");
      expect(hasil.codeVerifier).toBe("v1");
      expect(hasil.mode).toBe("login");
    });

    it("MENOLAK state yang diutak-atik", () => {
      const token = oidc.tandaTanganiState({
        provider: "google",
        nonce: "n1",
        codeVerifier: "v1",
        mode: "login",
      });
      const rusak = token.slice(0, -3) + "aaa";
      expect(() => oidc.bacaState(rusak)).toThrow();
    });
  });

  describe("domainDiizinkan", () => {
    it("MENOLAK semua bila daftar kosong — bukan mengizinkan semua", () => {
      delete process.env.SSO_ALLOWED_DOMAINS;
      expect(oidc.domainDiizinkan("budi@perusahaan.com")).toBe(false);
    });

    it("menerima domain yang terdaftar", () => {
      process.env.SSO_ALLOWED_DOMAINS = "perusahaan.com";
      expect(oidc.domainDiizinkan("budi@perusahaan.com")).toBe(true);
    });

    it("menolak domain di luar daftar", () => {
      process.env.SSO_ALLOWED_DOMAINS = "perusahaan.com";
      expect(oidc.domainDiizinkan("orang@gmail.com")).toBe(false);
    });

    it("tidak peka huruf besar/kecil", () => {
      process.env.SSO_ALLOWED_DOMAINS = "Perusahaan.COM";
      expect(oidc.domainDiizinkan("Budi@PERUSAHAAN.com")).toBe(true);
    });

    it("tidak tertipu domain yang hanya berakhiran sama", () => {
      process.env.SSO_ALLOWED_DOMAINS = "perusahaan.com";
      expect(oidc.domainDiizinkan("penyerang@jahatperusahaan.com")).toBe(false);
    });
  });

  describe("konfigurasi provider", () => {
    it("hanya melaporkan provider yang benar-benar dikonfigurasi", () => {
      expect(oidc.providerTersedia()).toEqual(["google"]);
    });

    it("MELEMPAR bila konfigurasi separuh — client id tanpa secret", async () => {
      jest.resetModules();
      process.env.OIDC_MICROSOFT_CLIENT_ID = "hanya-id";
      delete process.env.OIDC_MICROSOFT_CLIENT_SECRET;
      const ulang = await import("./oidc.service");
      expect(() => ulang.providerTersedia()).toThrow(/tidak lengkap/);
    });
  });

  describe("siapkanOtorisasi", () => {
    it("menyertakan PKCE, state, nonce, dan scope minimal", async () => {
      const { url, stateToken } = await oidc.siapkanOtorisasi("google", "daftar");
      const params = new URL(url).searchParams;

      expect(params.get("code_challenge_method")).toBe("S256");
      expect(params.get("code_challenge")).toBeTruthy();
      expect(params.get("scope")).toBe("openid email profile");
      expect(params.get("client_id")).toBe(CLIENT_ID);
      expect(params.get("state")).toBe(stateToken);

      // nonce di URL harus sama dengan yang tersimpan di state
      const state = oidc.bacaState(stateToken);
      expect(params.get("nonce")).toBe(state.nonce);
      expect(state.mode).toBe("daftar");
      expect(oidc.hitungCodeChallenge(state.codeVerifier)).toBe(params.get("code_challenge"));
    });

    it("tidak pernah meminta scope Drive", async () => {
      const { url } = await oidc.siapkanOtorisasi("google", "login");
      expect(url).not.toContain("drive");
    });
  });
});
