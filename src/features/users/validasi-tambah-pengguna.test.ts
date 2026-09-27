/**
 * Regresi Item #189 — form "Add Person" harus MENOLAK dengan terlihat.
 *
 * DILAPORKAN 26 Agu 2026: membuka modal Add User lalu langsung menekan
 * "Add Person" tanpa mengisi apa pun tidak menghasilkan apa-apa. Tidak ada
 * pesan, tidak ada toast, tidak ada border merah; modal tetap terbuka diam
 * saja. Pemeriksaan jaringan memastikan tidak ada `POST` yang terkirim — jadi
 * form itu memang menahan submit, tetapi tidak memberi tahu KENAPA.
 *
 * SEBABNYA BUKAN VALIDASI YANG BELUM DITULIS, dan ini yang membuat #189
 * menarik. Penjaganya SUDAH ADA di `handleAddPeople`, lengkap dengan
 * `toast.error(t("toast.allFieldsRequired"))`. Ia tidak pernah berjalan karena
 * tombolnya memakai `disabled` yang mencakup keempat field kosong: `onClick`
 * tidak menyala, sehingga penjaga dan toast-nya menjadi kode mati.
 *
 *   Umpan balik yang ditulis tetapi tidak bisa dijangkau sama saja dengan
 *   umpan balik yang tidak ditulis — dan lebih menyesatkan bagi yang membaca
 *   kodenya, sebab tampak sudah ditangani.
 *
 * Yang dilihat pengguna adalah tombol yang tidak bereaksi. Tombol yang tidak
 * bereaksi terbaca sebagai aplikasi rusak, bukan sebagai "ada yang belum Anda
 * isi" — admin yang buru-buru akan mengklik berulang lalu menyerah.
 *
 * Maka test ini menjaga DUA hal, dan yang pertama yang menentukan: tombolnya
 * TIDAK BOLEH dimatikan karena field kosong. Menambah pesan per-field tanpa
 * membuka tombolnya akan menghasilkan perbaikan yang tetap tak terlihat.
 *
 * Diperiksa statis terhadap teks sumber: yang dijaga adalah BENTUK
 * penolakannya. Pembuktian perilakunya di peramban menuntut sesi login.
 */
import fs from "fs";
import path from "path";

const AKAR = path.resolve(__dirname, "..", "..", "..");
const mentah = fs.readFileSync(
  path.join(AKAR, "src", "features", "users", "AdminUserPanel.tsx"),
  "utf8"
);

/** Kode saja — blok penjelasan di berkas itu mengutip bentuk lamanya. */
const kode = mentah.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Isi atribut `disabled` pada tombol "Add Person". */
const disabledTombolTambah = (): string => {
  const i = kode.indexOf("onClick={handleAddPeople}");
  expect(i).toBeGreaterThan(-1);
  const potong = kode.slice(i, i + 400);
  const m = potong.match(/disabled=\{([\s\S]*?)\}\s*\n/);
  expect(m).not.toBeNull();
  return m![1];
};

describe("#189 tombol Add Person tidak dimatikan oleh field kosong", () => {
  it("disabled tidak menyebut satu pun field wajib", () => {
    // Inilah cacat aslinya: selama salah satu dari keempat ini ada di sini,
    // onClick tidak pernah menyala dan penolakannya tak pernah terlihat.
    const d = disabledTombolTambah();
    for (const field of [
      "addPeopleUsername",
      "addPeopleFullName",
      "addPeopleEmail",
      "addPeoplePassword",
    ]) {
      expect(d).not.toContain(field);
    }
  });

  it("tetap dimatikan oleh galat format yang SUDAH punya pesan tampil", () => {
    // usernameError/emailError berbeda: keduanya sudah menampilkan alasannya
    // di bawah field, jadi tombol matinya tidak membingungkan.
    const d = disabledTombolTambah();
    expect(d).toContain("usernameError");
    expect(d).toContain("emailError");
  });
});

describe("#189 penolakan menyebutkan field mana yang kurang", () => {
  it("memvalidasi keempat field wajib saat submit", () => {
    expect(kode).toContain("addPeopleFullName.trim()");
    expect(kode).toContain("addPeoplePassword.trim()");
    expect(kode).toContain("addPeopleUsername.trim()");
    expect(kode).toContain("addPeopleEmail.trim()");
  });

  it("menyimpan galat per-field, bukan hanya satu toast ringkasan", () => {
    expect(kode).toContain("addPeopleErrors");
    expect(kode).toContain("setAddPeopleErrors");
  });

  it("tetap memunculkan toast ringkasan, seperti pola LoginScreen", () => {
    expect(kode).toContain("toast.allFieldsRequired");
  });

  it("galat per-field hilang begitu field diperbaiki", () => {
    // Pesan yang menetap sesudah diperbaiki membuat form terasa masih menolak.
    expect(kode).toMatch(/setAddPeopleErrors\(\(p\) => \(\{ \.\.\.p, fullName: undefined \}\)\)/);
    expect(kode).toMatch(/setAddPeopleErrors\(\(p\) => \(\{ \.\.\.p, password: undefined \}\)\)/);
  });
});

describe("#189 pesannya lewat i18n", () => {
  it("memakai kunci users.fieldRequired", () => {
    expect(kode).toContain('t("users.fieldRequired")');
  });

  it("tidak ada lagi pesan wajib-diisi yang dikeraskan", () => {
    // Sebelumnya `setUsernameError("Username wajib diisi")` dan padanan
    // emailnya ditulis harfiah, sehingga pengguna berbahasa Inggris melihat
    // pesan Indonesia di form ini saja.
    const keras = kode
      .split("\n")
      .map((baris, n) => ({ baris: baris.trim(), n: n + 1 }))
      .filter(({ baris }) => /"[^"]*wajib diisi[^"]*"/i.test(baris))
      .map(({ baris, n }) => `AdminUserPanel.tsx:${n} ${baris}`);
    expect(keras).toEqual([]);
  });
});
