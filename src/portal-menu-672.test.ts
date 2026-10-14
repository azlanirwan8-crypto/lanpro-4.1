/**
 * #672 — empat menu topbar wajib lewat portal ke document.body.
 *
 * KENAPA TEST INI ADA. Bar header (`AppContainer.tsx`) adalah flex item
 * ber-z-40: ia membentuk stacking context sendiri, jadi panel `z-50` apa pun
 * yang dirender DI DALAMNYA tetap berlangit-langitkan z-40 dan tidak bisa
 * menang atas scrim laci mobile (z-[45]) atau overlay modal (z-50) — gejala
 * aslinya: panel notifikasi terpotong pita kepala tabel. Perbaikannya me-render
 * panel lewat portal ke document.body pada z-[44] (di atas bar, di bawah scrim).
 *
 * jsdom tidak menghitung layout/stacking, jadi yang dikunci adalah bentuk
 * sumbernya: keempat panel memakai TopbarMenuPortal, kelas posisi lama
 * (`absolute right-0 ... z-50`) tidak kembali, dan handler klik-di-luar lama
 * (yang ref-nya hanya membungkus pemicu, bukan panel portaled) sudah dicabut —
 * klik di dalam panel portaled sekarang dicek lewat ref panel di dalam
 * TopbarMenuPortal.
 */
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname);
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

// jest di repo ini tidak menerima argumen pesan kedua pada expect(), jadi
// kegagalan per-berkas dilaporkan lewat throw dengan nama berkasnya.
const wajib = (kondisi: boolean, pesan: string) => {
  if (!kondisi) throw new Error(pesan);
};

const portal = baca("components/ui/TopbarMenuPortal.tsx");
const profil = baca("components/UserProfileDropdown.tsx");
const notifikasi = baca("components/NotificationsDropdown.tsx");
const webApps = baca("components/navigation/WebAppsDropdown.tsx");
const app = baca("AppContainer.tsx");
const hookNotif = baca("hooks/useAppNotifications.ts");

describe("TopbarMenuPortal (#672)", () => {
  it("me-render ke document.body lewat createPortal", () => {
    expect(portal).toContain("ReactDOM.createPortal");
    expect(portal).toContain("document.body");
  });

  it("menempatkan panel di z-[44] — di atas bar z-40, di bawah scrim z-[45]", () => {
    expect(portal).toContain("z-[44]");
    // z-50 hanya boleh disebut di komentar (penjelasan tangga), tidak sebagai kelas panel
    const tanpaKomentar = portal.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "");
    expect(tanpaKomentar).not.toContain("z-50");
  });

  it("klik-di-luar mengecek ref pemicu DAN ref panel portaled", () => {
    expect(portal).toContain("triggerRef.current?.contains(target)");
    expect(portal).toContain("panelRef.current?.contains(target)");
    expect(portal).toContain('window.addEventListener("scroll", onScroll, true)');
  });
});

describe("empat menu topbar melewati portal (#672)", () => {
  const berkas = { profil, notifikasi, webApps };

  it("ketiga komponen dropdown mengimpor dan memakai TopbarMenuPortal", () => {
    for (const [nama, sumber] of Object.entries(berkas)) {
      wajib(sumber.includes("TopbarMenuPortal"), `${nama}: tidak mengimpor TopbarMenuPortal`);
      wajib(
        /<TopbarMenuPortal[\s\S]*?open=/.test(sumber),
        `${nama}: panel tidak dirender lewat TopbarMenuPortal`
      );
    }
    expect(app).toContain("<TopbarMenuPortal");
    expect(app).toContain("triggerRef={headerMoreRef}");
  });

  it("kelas posisi lama absolute + z-50 tidak kembali di panel mana pun", () => {
    for (const [nama, sumber] of Object.entries(berkas)) {
      wajib(
        !/absolute right-0[^\n]*z-50/.test(sumber),
        `${nama}: kelas posisi lama absolute + z-50 kembali`
      );
    }
    expect(app).not.toContain('className="absolute right-0 top-full mt-1 z-50');
  });

  it("handler klik-di-luar lama (ref hanya pemicu) sudah dicabut", () => {
    // UserProfileDropdown dan hook notifikasi dulu memasang listener mousedown
    // dokumen yang hanya mengecek ref pembungkus — dengan panel portaled, klik
    // di dalam panel dianggap "di luar" dan menu mati sebelum aksi terjadi.
    expect(profil).not.toContain('addEventListener("mousedown"');
    expect(hookNotif).not.toContain('addEventListener("mousedown"');
    expect(app).not.toContain("headerMoreRef.current.contains");
  });

  it("notifikasi membawa triggerRef dan mode lembar-bawah mobile", () => {
    expect(notifikasi).toContain("triggerRef: React.RefObject<HTMLElement | null>");
    expect(notifikasi).toContain("lembarBawahMobile");
    expect(app).toContain("triggerRef={notificationsRef}");
  });
});

describe("anggaran stacking diperbarui (#729 + #672)", () => {
  it("komentar tangga z di AppContainer mencatat slot z-[44] menu portaled", () => {
    const i = app.indexOf("ANGGARAN STACKING");
    expect(i).toBeGreaterThan(0);
    const blok = app.slice(i, i + 1200);
    expect(blok).toContain("portal ke document.body");
    expect(blok).toContain("z-[44]");
    expect(blok).toContain("z-[45]");
  });
});
