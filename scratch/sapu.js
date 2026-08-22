(function(){
 var ID=/\b(Simpan|Hapus|Tambah|Batal|Kembali|Cari|Pilih|Semua|Tidak|Belum|Sudah|Ubah|Buat|Kelola|Proyek|Pengguna|Tugas|Rapat|Anda|Memuat|Terpilih|Terakhir|Baru|Keluar|Profil|Urutkan|Saring|Muat|Tutup|Lihat|Kosong|Berhasil|Gagal|Wajib|Nama|Tanggal|Jumlah|Daftar|Rincian|Salin|Unduh|Unggah|Sedang|Dengan|Untuk|Yang|Dari|dan\b|atau\b)/g;
 var t=document.body.innerText;
 var hit={};var m;while((m=ID.exec(t))){hit[m[0]]=(hit[m[0]]||0)+1;}
 // ambil baris yang mengandung kata indonesia
 var baris=t.split('\n').map(s=>s.trim()).filter(s=>s&&/\b(Simpan|Hapus|Tambah|Batal|Kembali|Cari|Pilih|Semua|Tidak|Belum|Sudah|Ubah|Buat|Kelola|Proyek|Pengguna|Tugas|Rapat|Anda|Memuat|Keluar|Profil|Berhasil|Gagal|Wajib|Daftar|Rincian|Salin|Unduh|Unggah|Untuk|Yang|Dari)\b/.test(s));
 return JSON.stringify({bocor:[...new Set(baris)].slice(0,40)});
})()
