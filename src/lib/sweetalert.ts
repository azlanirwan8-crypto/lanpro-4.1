import Swal from "sweetalert2";
import "./sweetalert.css";

const VELZON_BTN = {
  primary: "velzon-swal-btn velzon-swal-btn-primary",
  danger: "velzon-swal-btn velzon-swal-btn-danger",
} as const;

const VELZON_ICONS = {
  delete: "https://cdn.lordicon.com/gsqxdxog.json",
  success: "https://cdn.lordicon.com/lupuorrc.json",
} as const;

function buildVelzonHtml(
  iconSrc: string,
  iconColors: string,
  iconSize: number,
  title: string,
  text: string
): string {
  return `
    <div class="velzon-swal-content mt-3">
      <lord-icon
        src="${iconSrc}"
        trigger="loop"
        colors="${iconColors}"
        style="width:${iconSize}px;height:${iconSize}px"
      ></lord-icon>
      <div class="mt-4 pt-2 mx-5">
        <h4>${title}</h4>
        <p class="velzon-swal-text mx-4 mb-0">${text}</p>
      </div>
    </div>
  `;
}

/**
 * Ikon "pengguna disilang" untuk galat, menggantikan ikon tong sampah.
 *
 * Tong sampah menyiratkan sesuatu terhapus, sementara sebagian besar galat di
 * LanPro justru soal akses yang ditolak atau operasi yang gagal — tidak ada
 * yang dihapus. Ikon yang keliru membuat pengguna mengira datanya hilang.
 *
 * SVG DITULIS INLINE, bukan memakai lordicon seperti dua ikon lain. Alasannya:
 * lordicon menarik aset dari CDN eksternal, sehingga dialog galat justru gagal
 * menampilkan ikonnya persis ketika jaringan bermasalah — padahal itu keadaan
 * yang paling sering memunculkan galat. Versi inline selalu tampil.
 *
 * Animasinya digambar lewat CSS di sweetalert.css: lingkaran mengembang,
 * lalu dua garis silang tergores berurutan.
 */
function buildIkonUserSilang(size: number): string {
  return `
    <svg class="velzon-swal-usericon" width="${size}" height="${size}" viewBox="0 0 100 100"
         fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Akses ditolak">
      <circle class="vsu-ring" cx="50" cy="50" r="44" stroke="currentColor" stroke-width="4" opacity="0.25"/>
      <circle class="vsu-head" cx="42" cy="40" r="13" stroke="currentColor" stroke-width="5"
              stroke-linecap="round"/>
      <path class="vsu-body" d="M20 74c0-12 10-20 22-20s22 8 22 20" stroke="currentColor"
            stroke-width="5" stroke-linecap="round"/>
      <path class="vsu-x1" d="M68 36l18 18" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
      <path class="vsu-x2" d="M86 36l-18 18" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
    </svg>
  `;
}

/** Susunan dialog galat. Sama seperti buildVelzonHtml, tetapi memakai ikon inline. */
function buildVelzonHtmlGalat(iconSize: number, title: string, text: string): string {
  return `
    <div class="velzon-swal-content mt-3">
      ${buildIkonUserSilang(iconSize)}
      <div class="mt-4 pt-2 mx-5">
        <h4>${title}</h4>
        <p class="velzon-swal-text mx-4 mb-0">${text}</p>
      </div>
    </div>
  `;
}

const velzonPopupConfig = {
  customClass: {
    popup: "velzon-swal-popup",
  },
  buttonsStyling: false,
  showCloseButton: true,
  backdrop: true,
};

export const confirmDeleteAlert = async (
  title: string = "Apakah Anda Yakin?",
  text: string = "Data ini akan dihapus secara permanen dan tidak dapat dikembalikan!"
): Promise<boolean> => {
  const result = await Swal.fire({
    ...velzonPopupConfig,
    html: buildVelzonHtml(
      VELZON_ICONS.delete,
      "primary:#f7b84b,secondary:#f06548",
      100,
      title,
      text
    ),
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus!",
    cancelButtonText: "Batal",
    customClass: {
      ...velzonPopupConfig.customClass,
      confirmButton: `${VELZON_BTN.primary} me-2 mb-1`,
      cancelButton: `${VELZON_BTN.danger} mb-1`,
    },
    focusConfirm: false,
    reverseButtons: false,
  });

  return result.isConfirmed;
};

export const showSuccessAlert = (
  title: string = "Berhasil!",
  text: string = "Data berhasil dihapus."
) => {
  Swal.fire({
    ...velzonPopupConfig,
    html: buildVelzonHtml(
      VELZON_ICONS.success,
      "primary:#0ab39c,secondary:#405189",
      120,
      title,
      text
    ),
    showConfirmButton: true,
    confirmButtonText: "Tutup",
    customClass: {
      ...velzonPopupConfig.customClass,
      confirmButton: `${VELZON_BTN.primary} mb-1`,
    },
    timer: 3500,
    timerProgressBar: true,
  });
};

/**
 * Dialog peringatan / kesalahan.
 *
 * Ditambahkan karena useAuth.ts sebelumnya memanggil Swal.fire sendiri tanpa
 * customClass dan tanpa buttonsStyling:false — ia memakai confirmButtonColor,
 * yaitu styling inline bawaan SweetAlert2 yang justru digantikan oleh
 * pendekatan customClass. Akibatnya satu dialog di aplikasi ini berbentuk
 * berbeda dari dua lainnya.
 */
export const showErrorAlert = (
  title: string = "Terjadi Kesalahan",
  text: string = "",
  severity: "error" | "warning" = "error"
) => {
  Swal.fire({
    ...velzonPopupConfig,
    html: buildVelzonHtmlGalat(96, title, text),
    showConfirmButton: true,
    confirmButtonText: "Tutup",
    customClass: {
      ...velzonPopupConfig.customClass,
      popup: `velzon-swal-popup velzon-swal-${severity}`,
      confirmButton: `${VELZON_BTN.primary} mb-1`,
    },
  });
};
