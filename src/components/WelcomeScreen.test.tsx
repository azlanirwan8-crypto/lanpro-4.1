/**
 * Regresi Item #160 — pengguna baru tanpa proyek tidak boleh mendapat layar
 * yang menyuruhnya melakukan hal yang mustahil.
 *
 * Kegagalan yang dikunci di sini adalah kegagalan LOGIS, bukan visual: kartu
 * lama berbunyi "pilih salah satu proyek dari sidebar di sebelah kiri" pada
 * kondisi yang justru membuat sidebar itu kosong. Tidak ada gerbang yang bisa
 * melihat kalimat yang saling bertentangan dengan keadaannya sendiri —
 * tsc hijau, eslint hijau, audit:tema hijau, dan layarnya tetap buntu.
 *
 * Tiga hal yang dijaga:
 *   1. sapaan + status muncul, dan tombol profil (satu-satunya aksi nyata)
 *      benar-benar memanggil pembuka profil,
 *   2. pengguna biasa TIDAK ditawari membuat proyek, admin ditawari,
 *   3. setiap menu yang ditandai `butuhProyek` memang menu yang berada di
 *      balik penjaga `selectedProject` di AppContainer — supaya penguncian di
 *      sidebar tidak pernah melenceng dari alasan aslinya.
 */
import fs from "fs";
import path from "path";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { WelcomeScreen } from "./WelcomeScreen";
import { sidebarSections } from "../features/sidebar/config";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const render_ = (tambahan: Partial<React.ComponentProps<typeof WelcomeScreen>> = {}) => {
  const onOpenProfile = jest.fn();
  const onCreateProject = jest.fn();
  render(
    <WelcomeScreen
      namaPengguna="Alan"
      onOpenProfile={onOpenProfile}
      bolehBuatProyek={false}
      onCreateProject={onCreateProject}
      {...tambahan}
    />
  );
  return { onOpenProfile, onCreateProject };
};

describe("#160 layar sambutan tanpa proyek", () => {
  it("menyapa dan menjelaskan keadaan, bukan menyuruh memilih dari sidebar kosong", () => {
    render_();
    expect(screen.getByText("welcome.greetingNamed")).toBeInTheDocument();
    expect(screen.getByText("welcome.noProjectYet")).toBeInTheDocument();
    // Kalimat kartu lama tidak boleh ikut terbawa ke layar ini.
    expect(screen.queryByText("appShell.pickProjectHint")).not.toBeInTheDocument();
  });

  it("tombol profil memanggil pembuka profil", () => {
    const { onOpenProfile } = render_();
    fireEvent.click(screen.getByText("welcome.openProfile"));
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
  });

  it("pengguna biasa tidak ditawari membuat proyek; admin ditawari", () => {
    const { onCreateProject } = render_();
    expect(screen.queryByText("appShell.createNewProject")).not.toBeInTheDocument();
    expect(onCreateProject).not.toHaveBeenCalled();
  });

  it("admin mendapat tombol buat proyek yang berfungsi", () => {
    const { onCreateProject } = render_({ bolehBuatProyek: true });
    fireEvent.click(screen.getByText("appShell.createNewProject"));
    expect(onCreateProject).toHaveBeenCalledTimes(1);
  });

  it("modul terkunci ditampilkan, supaya layar terbaca terkunci dan bukan rusak", () => {
    render_();
    expect(screen.getByText("welcome.lockedTitle")).toBeInTheDocument();
    expect(screen.getByText("sidebar.kanbanBoard")).toBeInTheDocument();
  });
});

describe("#160 revisi design review — menu disembunyikan, bukan dikunci", () => {
  /**
   * Kegagalan yang dikunci: menu butuh-proyek muncul kembali di sidebar untuk
   * pengguna tanpa proyek. Bentuk lamanya (opasitas 50% + gembok) mengulang
   * grid modul di layar ini, merebut titik pandang pertama dari sapaan, dan
   * berkontras 3,17:1 — di bawah ambang WCAG AA 4,5:1.
   *
   * `dashboard` sengaja DIKECUALIKAN: ia beranda dan mendarat di layar
   * sambutan, bukan layar kosong, jadi navigasi tidak pernah benar-benar
   * kosong.
   */
  const isi = fs.readFileSync(
    path.resolve(__dirname, "..", "features", "sidebar", "index.tsx"),
    "utf8"
  );

  it("sidebar tidak lagi merender jalur item terkunci", () => {
    expect(isi).not.toContain("cursor-not-allowed");
    expect(isi).not.toContain("const terkunci");
  });

  it("menu butuh-proyek disaring saat daftar proyek kosong", () => {
    expect(isi).toContain("!item.butuhProyek || item.tetapTampil");
  });

  it("hanya dashboard yang dikecualikan dari penyaringan", () => {
    const dikecualikan = sidebarSections
      .flatMap((s) => s.items)
      .filter((i) => i.tetapTampil)
      .map((i) => i.id);
    expect(dikecualikan).toEqual(["dashboard"]);
  });
});

describe("#160 penandaan butuhProyek selaras dengan penjaga AppContainer", () => {
  /**
   * `users` dan `master` punya cabang SENDIRI di atas penjaga
   * `selectedProject ?`, jadi keduanya tetap tampil tanpa proyek. Selebihnya
   * jatuh ke penjaga itu dan pasti memulangkan layar kosong.
   */
  const BEBAS = new Set(["users", "master"]);

  it("hanya menu yang benar-benar bisa tampil tanpa proyek yang dibiarkan bebas", () => {
    for (const seksi of sidebarSections) {
      for (const item of seksi.items) {
        if (BEBAS.has(item.id)) {
          expect(item.butuhProyek).toBeFalsy();
        } else {
          expect(item.butuhProyek).toBe(true);
        }
      }
    }
  });

  it("setiap id yang dibebaskan memang punya cabangnya sendiri di AppContainer", () => {
    const isi = fs.readFileSync(path.resolve(__dirname, "..", "AppContainer.tsx"), "utf8");
    const penjaga = isi.indexOf("} : selectedProject ? (".replace("} ", ""));
    expect(penjaga).toBeGreaterThan(0);
    const sebelumPenjaga = isi.slice(0, penjaga);
    for (const id of BEBAS) {
      expect(sebelumPenjaga).toContain(`currentView === "${id}"`);
    }
  });
});
