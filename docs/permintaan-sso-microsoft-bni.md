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
