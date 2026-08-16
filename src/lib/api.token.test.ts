/**
 * @jest-environment jsdom
 */
/**
 * Test #93: token mengikuti pilihan "Remember Me".
 *
 * Sebelum ini `setAuthToken` selalu menulis ke localStorage tanpa cabang
 * `remember` sama sekali, sementara profil sesi memang mengikutinya. Tidak
 * mencentang "Remember Me" karena itu hanya melupakan PROFIL — kredensialnya
 * tetap tinggal melewati penutupan peramban.
 *
 * Yang diuji di sini bukan "token tersimpan", melainkan **DI MANA** ia
 * tersimpan dan **apa yang terjadi pada salinan lamanya**. Test yang hanya
 * memeriksa `getAuthToken()` mengembalikan nilai akan lulus baik cacatnya ada
 * maupun tidak.
 */

import { getAuthToken, setAuthToken, clearAuthToken } from "./api";

const KUNCI = "lanpro_jwt_token";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("#93 lokasi token mengikuti Remember Me", () => {
  it("remember = true menyimpan lintas sesi peramban", () => {
    setAuthToken("token-a", true);

    expect(localStorage.getItem(KUNCI)).toBe("token-a");
    expect(sessionStorage.getItem(KUNCI)).toBeNull();
  });

  it("remember = false menyimpan hanya selama tab hidup", () => {
    setAuthToken("token-b", false);

    expect(sessionStorage.getItem(KUNCI)).toBe("token-b");
    expect(localStorage.getItem(KUNCI)).toBeNull();
  });

  it("beralih ke sesi sementara MEMBUANG salinan permanennya", () => {
    // Inilah inti #93. `getAuthToken` membaca localStorage lebih dulu, jadi
    // token permanen yang tertinggal akan menutupi token sementara — dan
    // penggunanya tetap "diingat" meski memilih tidak.
    setAuthToken("token-lama", true);
    setAuthToken("token-baru", false);

    expect(localStorage.getItem(KUNCI)).toBeNull();
    expect(getAuthToken()).toBe("token-baru");
  });

  it("beralih ke permanen membuang salinan sementaranya", () => {
    setAuthToken("token-lama", false);
    setAuthToken("token-baru", true);

    expect(sessionStorage.getItem(KUNCI)).toBeNull();
    expect(getAuthToken()).toBe("token-baru");
  });
});

describe("tanpa argumen `remember`, lokasi DIPERTAHANKAN", () => {
  /**
   * Penyegaran token dan kembalian SSO memanggil `setAuthToken` tanpa tahu
   * pilihan pengguna. Bila keduanya memaksa localStorage, satu penyegaran saja
   * memindahkan sesi sementara ke penyimpanan permanen — membatalkan pilihan
   * penggunanya tanpa ada yang menyadari.
   */
  it("sesi sementara tetap sementara sesudah disegarkan", () => {
    setAuthToken("token-awal", false);
    setAuthToken("token-segar");

    expect(sessionStorage.getItem(KUNCI)).toBe("token-segar");
    expect(localStorage.getItem(KUNCI)).toBeNull();
  });

  it("sesi permanen tetap permanen sesudah disegarkan", () => {
    setAuthToken("token-awal", true);
    setAuthToken("token-segar");

    expect(localStorage.getItem(KUNCI)).toBe("token-segar");
    expect(sessionStorage.getItem(KUNCI)).toBeNull();
  });

  it("tanpa token sebelumnya, bawaannya permanen", () => {
    setAuthToken("token-pertama");
    expect(localStorage.getItem(KUNCI)).toBe("token-pertama");
  });
});

describe("logout membersihkan KEDUA penyimpanan", () => {
  it("token sementara ikut terhapus", () => {
    setAuthToken("token-b", false);
    clearAuthToken();

    expect(getAuthToken()).toBeNull();
    expect(sessionStorage.getItem(KUNCI)).toBeNull();
  });

  it("token permanen ikut terhapus", () => {
    setAuthToken("token-a", true);
    clearAuthToken();

    expect(getAuthToken()).toBeNull();
    expect(localStorage.getItem(KUNCI)).toBeNull();
  });
});
