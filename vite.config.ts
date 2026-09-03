import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // `loadEnv` sengaja TIDAK dipakai lagi (#292). Ia membaca SELURUH variabel
  // lingkungan (prefix kosong), dan satu-satunya pemakainya dulu adalah blok
  // `define` yang membocorkan kunci API. Membiarkannya di sini hanya
  // mengundang pemakaian berikutnya yang sama berbahayanya.
  return {
    plugins: [react(), tailwindcss()],
    /**
     * TIDAK ADA BLOK `define` DI SINI, dan itu disengaja (#292).
     *
     * Dulu berisi `'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)`,
     * yang mengganti rujukan itu dengan NILAI HARFIAHNYA saat build sehingga
     * kunci API ikut terpanggang ke berkas JavaScript publik. Dibuktikan: nilai
     * kunci dicari di `dist/assets/*.js` dan ketemu -- termasuk ketika kunci
     * hanya datang dari variabel lingkungan proses, yaitu persis cara Vercel
     * menyuntikkannya.
     *
     * Seluruh panggilan Gemini kini di sisi server. Jangan menambahkan kembali
     * `define` untuk rahasia apa pun: apa yang masuk ke bundel klien adalah
     * publik, tanpa kecuali.
     */
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          /**
           * Memecah vendor ke potongan sendiri (#285).
           *
           * MASALAHNYA BUKAN PEMUATAN MALAS. Ketujuh belas tampilan sudah
           * terpecah benar lewat `lazyWithRetry` di `AppRoutes.tsx`, dan itu
           * TIDAK boleh diutak-atik. Yang tersisa: seluruh vendor menumpuk di
           * satu potongan masuk 1,95 MB (551 kB gzip) yang harus tuntas
           * terunduh sebelum piksel pertama muncul — termasuk layar login.
           *
           * KEUNTUNGANNYA CACHE, BUKAN UKURAN TOTAL. Memecah tidak mengurangi
           * byte yang diunduh pengunjung pertama; yang berubah adalah rilis
           * BERIKUTNYA. React, i18next, dan lucide hampir tidak pernah
           * berubah, jadi memisahkannya membuat pengguna lama hanya mengunduh
           * ulang kode aplikasinya saja, bukan seluruh 551 kB.
           *
           * DIPECAH PER PUSTAKA, BUKAN PER UKURAN. Pemecahan yang terlalu
           * halus menambah permintaan HTTP tanpa menambah manfaat, dan
           * pemecahan yang salah bisa membuat sebuah pustaka termuat SESUDAH
           * komponen yang memakainya. Pengelompokan di bawah mengikuti batas
           * pustaka yang nyata, sehingga Rollup bisa mengurutkan
           * ketergantungannya sendiri.
           */
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return;

            // React harus satu potongan dengan react-dom dan scheduler.
            // Memisahkannya membuat dua salinan runtime React hidup
            // berdampingan, dan gejalanya bukan galat melainkan hook yang
            // diam-diam kehilangan konteks.
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
              return "vendor-react";
            }
            if (/[\\/]node_modules[\\/](i18next|react-i18next)/.test(id)) {
              return "vendor-i18n";
            }
            if (/[\\/]node_modules[\\/](lucide-react)[\\/]/.test(id)) {
              return "vendor-ikon";
            }
            if (/[\\/]node_modules[\\/](motion|framer-motion)[\\/]/.test(id)) {
              return "vendor-animasi";
            }
            if (/[\\/]node_modules[\\/](socket\.io-client|engine\.io-client)[\\/]/.test(id)) {
              return "vendor-soket";
            }
            if (/[\\/]node_modules[\\/](sweetalert2|sonner)[\\/]/.test(id)) {
              return "vendor-dialog";
            }
            // react-markdown menyeret seluruh rantai unified/remark/mdast.
            if (
              /[\\/]node_modules[\\/](react-markdown|remark-.*|rehype-.*|unified|mdast-.*|micromark.*|hast-.*|unist-.*|vfile.*|property-information|character-entities.*|decode-named-character-reference|comma-separated-tokens|space-separated-tokens|html-url-attributes|zwitch|longest-streak|trim-lines|bail|is-plain-obj|trough|devlop|estree-.*|ccount|markdown-table|escape-string-regexp)[\\/]/.test(
                id
              )
            ) {
              return "vendor-markdown";
            }
            /**
             * SISANYA SENGAJA TIDAK DIKELOMPOKKAN — jangan tambahkan
             * catch-all `return "vendor-lain"` di sini.
             *
             * Sempat dicoba dan hasilnya LEBIH BURUK, terukur: potongan
             * catch-all itu membengkak jadi 1,87 MB karena ia menarik
             * dependensi yang tadinya hanya dimuat oleh tampilan malas —
             * `html2canvas` dan `jspdf` milik Timeline — keluar dari potongan
             * malasnya dan masuk ke potongan bersama. Timeline memang
             * menyusut dari 638 kB jadi 38 kB, tapi bebannya cuma pindah ke
             * muka, dibayar oleh setiap pengunjung termasuk yang tidak pernah
             * membuka Timeline.
             *
             * Dengan mengembalikan undefined, Rollup memakai pemecahan
             * otomatisnya, yang sudah benar menaruh dependensi khusus-satu-
             * tampilan di potongan tampilan itu sendiri.
             */
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: false,
      port: 3000,
    },
  };
});
