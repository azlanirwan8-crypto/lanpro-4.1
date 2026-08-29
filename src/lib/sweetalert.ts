import i18n from "../i18n";
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
 * Susunan dialog galat — TANPA ikon.
 *
 * Sebelumnya memakai ikon tong sampah, yang keliru karena menyiratkan ada data
 * terhapus padahal kebanyakan galat menyangkut akses ditolak atau operasi
 * gagal. Ikon itu sempat diganti "pengguna disilang", lalu pemilik proyek
 * memutuskan menghilangkannya sama sekali: judul dan pesannya sudah cukup
 * menjelaskan, dan tanpa ikon dialognya terasa lebih tenang.
 */
function buildVelzonHtmlGalat(_iconSize: number, title: string, text: string): string {
  return `
    <div class="velzon-swal-content mt-3">
      <div class="mt-2 pt-2 mx-5">
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

export const confirmDeleteAlert = async (title?: string, text?: string): Promise<boolean> => {
  const result = await Swal.fire({
    ...velzonPopupConfig,
    html: buildVelzonHtml(
      VELZON_ICONS.delete,
      "primary:#f7b84b,secondary:#f06548",
      100,
      title ?? i18n.t("alerts.confirmTitle"),
      text ?? i18n.t("alerts.confirmText")
    ),
    showCancelButton: true,
    confirmButtonText: i18n.t("alerts.yesDelete"),
    cancelButtonText: i18n.t("alerts.cancel"),
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

export const showSuccessAlert = (title?: string, text?: string) => {
  Swal.fire({
    ...velzonPopupConfig,
    html: buildVelzonHtml(
      VELZON_ICONS.success,
      "primary:#0ab39c,secondary:#405189",
      120,
      title ?? i18n.t("alerts.successTitle"),
      text ?? i18n.t("alerts.successDefault")
    ),
    showConfirmButton: true,
    confirmButtonText: i18n.t("alerts.close"),
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
  title: string = i18n.t("alerts.errorTitle2"),
  text: string = "",
  severity: "error" | "warning" = "error"
) => {
  Swal.fire({
    ...velzonPopupConfig,
    html: buildVelzonHtmlGalat(96, title, text),
    showConfirmButton: true,
    confirmButtonText: i18n.t("alerts.close"),
    customClass: {
      ...velzonPopupConfig.customClass,
      popup: `velzon-swal-popup velzon-swal-${severity}`,
      confirmButton: `${VELZON_BTN.primary} mb-1`,
    },
  });
};
