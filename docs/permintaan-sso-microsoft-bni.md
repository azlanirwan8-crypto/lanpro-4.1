# Permintaan pendaftaran aplikasi SSO ke TI BNI

Berkas ini disiapkan untuk item **#305** di `AUDIT.md`. Isinya adalah permintaan
yang bisa langsung diteruskan ke administrator Microsoft Entra ID (Azure AD) di
BNI, tanpa perlu diterjemahkan dulu dari istilah teknis.

Selama permintaan ini belum dijawab, **#305 tidak bisa dikerjakan** — bukan
karena kodenya belum siap, melainkan karena tanpa kredensial dari tenant BNI
provider `microsoft` tidak pernah masuk ke `providerTersedia()`.

---

## Teks yang bisa disalin

> **Perihal: Permintaan pendaftaran aplikasi untuk Single Sign-On (Microsoft Entra ID)**
>
> Kami menggunakan aplikasi manajemen proyek internal bernama **LanPro**
> (`https://lanpro.my.id`). Saat ini pengguna masuk memakai email dan kata
> sandi. Kami ingin menambahkan opsi masuk memakai akun Microsoft kantor,
> supaya tidak ada kata sandi tambahan yang perlu dikelola dan akses otomatis
> mengikuti status kepegawaian di Entra ID.
>
> Aplikasi ini memakai **OpenID Connect**, standar yang sama dengan yang sudah
> kami pakai untuk Google. Yang kami minta adalah pendaftaran satu aplikasi
> (_app registration_) di tenant `bni.co.id` dengan rincian berikut:
>
> | Isian                    | Nilai                                                     |
> | ------------------------ | --------------------------------------------------------- |
> | Nama aplikasi            | LanPro                                                    |
> | Jenis akun yang didukung | Hanya akun di direktori organisasi ini (single tenant)    |
> | Platform                 | Web                                                       |
> | Redirect URI             | `https://lanpro.my.id/api/auth/oidc/callback`             |
> | Izin yang dibutuhkan     | `openid`, `profile`, `email` (Microsoft Graph, delegated) |
> | Client secret            | Perlu dibuatkan satu, beserta masa berlakunya             |
>
> Izin yang diminta hanya untuk **membaca identitas dasar** pengguna yang login:
> alamat email, nama, dan pengenal akun. Aplikasi ini **tidak** meminta akses ke
> email, kalender, berkas, maupun data lain di Microsoft 365.
>
> Setelah pendaftaran selesai, mohon dikirimkan tiga nilai berikut:
>
> 1. **Application (client) ID**
> 2. **Client secret** (nilai rahasianya, bukan Secret ID)
> 3. **Directory (tenant) ID**
>
> Ketiganya akan kami simpan sebagai variabel lingkungan di server dan tidak
> ditulis ke dalam kode.
>
> Satu pertanyaan teknis tambahan, bila berkenan: apakah `id_token` dari tenant
> ini menyertakan klaim **`email_verified`** atau **`xms_edov`**? Jawaban itu
> menentukan satu keputusan kebijakan di sisi kami dan bisa menghemat satu
> putaran pengujian.

---

## Catatan untuk sisi LanPro

Ketiga nilai di atas dipetakan ke variabel lingkungan berikut:

| Nilai dari TI BNI       | Variabel lingkungan            |
| ----------------------- | ------------------------------ |
| Application (client) ID | `OIDC_MICROSOFT_CLIENT_ID`     |
| Client secret           | `OIDC_MICROSOFT_CLIENT_SECRET` |
| Directory (tenant) ID   | `OIDC_MICROSOFT_TENANT`        |

`OIDC_REDIRECT_URI` harus **sama persis** dengan Redirect URI yang didaftarkan
di Azure — beda satu garis miring pun ditolak Microsoft.

**Client secret punya masa berlaku.** Tanyakan tanggal kedaluwarsanya dan catat;
begitu ia lewat, login Microsoft berhenti tanpa perubahan kode apa pun, dan
gejalanya akan terlihat seperti kerusakan mendadak.

Sesudah ketiganya terisi, sisa pekerjaannya ada di #305: kebijakan
`email_verified`, lalu menghapus satu baris penyaring di
`src/features/auth/components/SsoButtons.tsx`.

**Jangan menghapus baris penyaring itu lebih dulu.** Tanpa kredensial, tombolnya
muncul tetapi alurnya tidak berfungsi — itu persis keluhan yang melahirkan #197.

---

## Opsi A — undang sebagai tamu, tanpa menunggu TI BNI

Ditambahkan 31 Agu 2026 sesudah percobaan login pertama yang sungguhan.

Percobaan memakai `100783@hq.bni.co.id` ditolak Microsoft:

> **AADSTS50020** — User account `100783@hq.bni.co.id` from identity provider
> `https://sts.windows.net/56a5465f-c594-43ef-b2e1-2017477901c7/` does not exist
> in tenant `Universitas Siber Asia` and cannot access the application
> `2062ee5d-ee94-4e4c-9e08-0aa5de55d865` (LanPro) in that tenant.

**Penolakan ini terjadi di Microsoft, sebelum satu baris kode LanPro
dijalankan.** Tidak ada perubahan kode di repositori ini yang bisa
memperbaikinya. Sebabnya: aplikasi LanPro terdaftar **single-tenant** di
direktori Universitas Siber Asia, sementara akun itu milik direktori BNI.

Opsi A menyelesaikannya **tanpa** mengubah pendaftaran aplikasi, dan karena itu
tanpa menyentuh jaminan keamanan yang sudah ada.

### Yang dikerjakan di Azure (sisi pemilik proyek)

1. Masuk ke [portal Azure](https://portal.azure.com) sebagai admin direktori
   **Universitas Siber Asia**.
2. **Microsoft Entra ID → Users → New user → Invite external user.**
3. Isi alamatnya persis: `100783@hq.bni.co.id`. Kirim undangan.
4. Pemilik alamat membuka email undangan dan **menuntaskan (redeem)** dengan
   akun BNI-nya sendiri.
5. Bila aplikasi LanPro memakai _user assignment required_, tambahkan tamu itu
   di **Enterprise applications → LanPro → Users and groups**.

Sesudah langkah 4, akun tamu itu ada di direktori kita, dan `AADSTS50020` tidak
muncul lagi untuk alamat tersebut.

### Yang sudah dikerjakan di sisi kode

`hq.bni.co.id` ditambahkan ke daftar domain SSO bawaan. Ini **bukan** detail
kosmetik: `domainDiizinkan()` mencocokkan domain **persis**, sehingga
`bni.co.id` tidak pernah mencakup `hq.bni.co.id`. Tanpa penambahan itu, login
tamu tetap ditolak sesudah undangan Azure beres — dan gejalanya akan terlihat
seperti undangannya yang gagal, padahal bukan.

⚠️ **Nilai bawaan di kode belum tentu yang dipakai production.** Urutannya
database → env → bawaan kode (#279). Bila kolom `ssoAllowedDomains` di
pengaturan sudah terisi, ubah lewat **Pengaturan → Integrasi**; bawaan kode
tidak akan terbaca.

### Kenapa BUKAN "jadikan aplikasi multi-tenant"

Mengubah `OIDC_MICROSOFT_TENANT` menjadi `organizations` memang menghilangkan
`AADSTS50020` — dan langsung memasang dinding baru di belakangnya.
`emailBolehDipercaya()` (`server/services/oidc.service.ts`) memercayai alamat
tanpa klaim `email_verified` **hanya** bila tenant menunjuk satu direktori
tertentu. `organizations` dan `common` masuk daftar tenant kumpulan, jadi
kelonggaran itu mati dan login Microsoft ditolak lagi — kecuali tenant BNI
terbukti mengirim `xms_edov`, dan itu belum pernah dibuktikan.

Jadi opsi itu **menukar satu dinding dengan dinding lain**, bukan membuka jalan.

### Batas opsi A — kapan berhenti memakainya

Tiap orang harus diundang **satu per satu**, dan tiap orang harus menemukan
lalu mengklik undangannya sendiri. Untuk satu-dua orang ini jalan pintas yang
baik. Untuk puluhan orang BNI ia berubah menjadi puluhan undangan manual
ditambah puluhan orang yang harus menuntaskan langkah di kotak masuk
masing-masing. **Di titik itu, permintaan di bagian atas berkas inilah jawaban
yang benar** — dan barulah biaya percakapan dengan TI BNI sepadan.

Dua pengaman tetap berlaku untuk tamu, sama seperti pengguna internal: daftar
domain SSO sebagai gerbang pertama, dan status `pending` yang menolak login
lewat `akun_belum_aktif` sampai admin menyetujui.

### Yang masih harus dibuktikan, bukan diasumsikan

`verifikasiIdToken()` mengambil alamat dari klaim `email` saja — tidak ada
cadangan ke `preferred_username`. Untuk akun tamu, `preferred_username`
berbentuk `100783_hq.bni.co.id#EXT#@...onmicrosoft.com`, sedangkan klaim `email`
biasanya tetap alamat aslinya. **Biasanya, bukan pasti.** Bila login tamu
ditolak `domain_tidak_diizinkan` padahal `hq.bni.co.id` sudah terdaftar, isi
klaim `email` itulah yang pertama harus diperiksa.
