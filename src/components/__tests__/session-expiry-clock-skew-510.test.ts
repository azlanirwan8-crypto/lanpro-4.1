import { calculateTokenRemainingSeconds } from "../SessionExpiryWarning";

describe("Item #510 - Relative JWT Session Timer & Clock Skew Tolerance", () => {
  // Helper to build a mock JWT token with given payload
  const createMockToken = (payload: { iat?: number; exp?: number; [key: string]: any }) => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64");
    return `${header}.${body}.signature`;
  };

  test("Menghitung sisa waktu 7200 detik dengan benar saat jam laptop sinkron", () => {
    const serverNow = 1700000000; // detik
    const clientNowMs = serverNow * 1000;
    const token = createMockToken({
      iat: serverNow,
      exp: serverNow + 7200,
    });

    // Baru diterima pada clientNowMs
    const remaining = calculateTokenRemainingSeconds(token, clientNowMs, clientNowMs);
    expect(remaining).toBe(7200);

    // 1000 detik berlalu pada jam klien
    const remainingAfter1000s = calculateTokenRemainingSeconds(
      token,
      clientNowMs,
      clientNowMs + 1000 * 1000
    );
    expect(remainingAfter1000s).toBe(6200);
  });

  test("KEBAL CLOCK SKEW: Jam laptop 1 tahun lebih maju (2026 vs 2025) tidak langsung memicu kadaluarsa", () => {
    const serverNow = 1700000000; // Jam server (misal 2025)
    const token = createMockToken({
      iat: serverNow,
      exp: serverNow + 7200, // Expire 2 jam dari jam server
    });

    // Jam laptop pengguna 1 tahun lebih maju (+ 31.536.000 detik)
    const laptopSkewedNowMs = (serverNow + 31536000) * 1000;

    // Saat token diterima di laptop, disimpan pada timestamp laptopSkewedNowMs
    const remainingAtLogin = calculateTokenRemainingSeconds(
      token,
      laptopSkewedNowMs,
      laptopSkewedNowMs
    );

    // Dulu: decoded.exp (1.700.007.200) - laptopNow (1.731.536.000) = -31.528.800 (LANGSUNG KICK OUT / GAGAL LOGIN)
    // Sekarang: Murni menghitung TTL (7200) - elapsed(0) = 7200 detik (SUKSES)
    expect(remainingAtLogin).toBe(7200);

    // Setelah 1 menit (60 detik) berlalu di laptop:
    const remainingAfter60s = calculateTokenRemainingSeconds(
      token,
      laptopSkewedNowMs,
      laptopSkewedNowMs + 60 * 1000
    );
    expect(remainingAfter60s).toBe(7140);
  });

  test("Menghitung mundur hingga 0 detik ketika masa aktif TTL (7200s) benar-benar habis", () => {
    const serverNow = 1700000000;
    const clientNowMs = serverNow * 1000;
    const token = createMockToken({
      iat: serverNow,
      exp: serverNow + 7200,
    });

    // Tepat 7200 detik berlalu
    const remainingAtExpiry = calculateTokenRemainingSeconds(
      token,
      clientNowMs,
      clientNowMs + 7200 * 1000
    );
    expect(remainingAtExpiry).toBe(0);

    // Melebihi 7200 detik (tetap 0, tidak minus)
    const remainingPastExpiry = calculateTokenRemainingSeconds(
      token,
      clientNowMs,
      clientNowMs + 8000 * 1000
    );
    expect(remainingPastExpiry).toBe(0);
  });
});
