# Audit UI LanPro #869

Review 20 November 2026. Pemeriksaan desktop dilakukan pada sesi proyek LanPro yang sudah login. Perubahan diperiksa terpisah di branch `fix/ui-869`. Preview QA lokal memakai data contoh pada lebar 1366 dan 390 piksel. Navigasi proyek dilakukan secara baca-saja.

## Temuan dan perbaikan

| Layar | Pengamatan | Hasil pada branch |
| --- | --- | --- |
| Dashboard | Pada proyek yang diamati, kartu Active Tasks menunjukkan 51. Footer kartu menunjukkan 47, sementara kartu Completed menunjukkan 1 dari 51. Komponen menghitung angka utama dengan dua literal status dan footer dengan pemilah lain. | Nilai utama memakai pemilah tugas aktif Dashboard yang mengenali status selesai dari MasterData. Footer menghitung seluruh tugas yang masih terbuka, termasuk backlog. |
| Issue List | Tombol chat menutupi navigasi halaman di kanan bawah saat daftar penuh. | Footer desktop menyediakan ruang untuk lebar tombol dan jaraknya dari tepi. |
| Meeting Notes | Tabel berisi empat rapat. Nama lampiran panjang membuat kolom aksi berada dekat tepi area gulir. Footer berada satu garis dengan tombol chat. | Ruang kanan footer mengikuti perbaikan Issue List. Keterjangkauan aksi pada semua panjang nama berkas masih perlu uji tersendiri. |
| Documentation | Daftar, pencarian, lampiran, dan aksi per baris tampil. Susunan footer sama dengan Meeting Notes. | Footer memakai jarak kanan yang sama. |
| Flowchart Editor | Daftar diagram tampil. Deskripsi panjang menambah tinggi baris, sehingga lebih sedikit diagram terlihat dalam satu layar. | Jarak kanan footer disamakan. Tinggi baris masih menyesuaikan isi agar deskripsi tetap terbaca. |
| Quality Assessment | Pada suite kosong terlihat 0%, “1 Modules”, dan pesan suite kosong. Pemilih sumber AI sudah berada di modal pada deployment yang ditinjau. Di ponsel, judul matriks dan dua filter berebut ruang pada baris yang sama. | Suite kosong menampilkan tanda pisah untuk pass rate. Bahasa Inggris menampilkan “1 Module”. Judul dan kontrol tersusun dua baris di ponsel. Pagination desktop mendapat ruang untuk chat. Desktop dan ponsel diperiksa menggunakan komponen QA asli. |
| User Management | Daftar dan metrik pengguna tampil. Pemeriksaan kode tab dokumen menemukan dua header berbahasa Inggris yang tampil literal. | Item #868 memindahkan nama berkas dan tanggal unggah ke kamus Indonesia dan Inggris. Pemeriksaan teks repo lulus. |

## Layar lain yang dibuka

| Layar | Yang terlihat dalam sesi desktop |
| --- | --- |
| Planning & Sprint | Backlog, kartu sprint dan progres tiap penanggung jawab tampil. Memulai atau menyelesaikan sprint akan mengubah data, sehingga kedua aksi belum diuji pada sesi ini. |
| Kanban Board | Swimlane, kolom dan kartu tampil. Kolom paling kanan membutuhkan gulir horizontal. Drag-and-drop belum diuji pada data proyek. |
| Roadmap & Timeline | Toolbar tanggal, kontrol skala, hierarki pekerjaan dan area jadwal tampil. Kondisi milestone kosong dapat dibedakan dari daftar pekerjaan yang terisi. |
| Team | Ringkasan, pencarian, pilihan tampilan dan kartu anggota tampil. Perubahan keanggotaan belum diuji. |
| Master Data | Daftar kategori dan baris prioritas tampil. Urutan dan aksi edit dapat dikenali dari tiap baris. |
| User Sessions | Pencarian, filter, badge status, dan aksi baris terlihat. Judul status dapat membungkus pada viewport yang diperiksa. |
| Activity Log | Ringkasan aktivitas, pencarian dan tabel tampil. ID audit berada di kolom kanan. |
| Enterprise Audit | Filter entitas, jenis akses dan tautan detail terlihat. |
| Settings & Integration | Tab konfigurasi, form, indikator status dan tombol simpan tampil. Sejumlah label tampak bercampur Inggris dan Indonesia. Terjemahan menyeluruh Settings masih perlu ditinjau. |

## Animasi dan interaksi

- Tombol Velzon mengubah warna, border, bayangan, opacity dan transform melalui transisi 180 ms. Ukuran dan posisi layout tidak ikut dianimasikan oleh deklarasi tersebut.
- Tautan dan select menjadi bagian dari siklus Tab pada modal yang memakai jebakan fokus. Gerakan dekoratif berulang pada ikon logout mengikuti preferensi kurangi gerakan.
- Isian teks sudah memiliki transisi fokus di stylesheet bersama. Kartu interaktif sudah memiliki efek hover dan chart Dashboard sudah membaca preferensi gerak pengguna.
- Kelancaran pada perangkat fisik kelas bawah, navigasi lengkap dengan pembaca layar, seluruh variasi izin, dan pengukuran frame-time belum terverifikasi.

## Batas pemeriksaan

Enam belas layar utama dibuka pada satu proyek dan satu peran. Login baru, logout, DB Explorer, percakapan privat, pemulihan backup, serta seluruh alur tulis belum ditelusuri secara interaktif. Pemeriksaan QA ponsel menggunakan browser dengan viewport 390 piksel. Bukti lokal menjelaskan tampilan kandidat rilis; verifikasi pascadeploy masih diperlukan.
