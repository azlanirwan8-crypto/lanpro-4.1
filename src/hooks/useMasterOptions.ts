import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";

/**
 * Membaca pilihan dropdown dari MasterData (item #140).
 *
 * KENAPA ADA. Sebelumnya tiap dropdown menulis daftarnya sendiri. SIT/UAT/PTR
 * misalnya ditulis DUA KALI — di AddSuiteModal dan di QASuiteSidebar — jadi
 * menambah satu fase menuntut penyuntingan keduanya, dan melewatkan salah satu
 * tidak menimbulkan galat apa pun, hanya dua layar yang diam-diam berbeda.
 *
 * Dibaca dari store, bukan lewat prop, supaya komponen yang selama ini tidak
 * menerima `masterData` (AddSuiteModal, EditSprintModal, NewSprintModal) tidak
 * perlu dialiri prop melewati beberapa lapis hanya untuk mengisi satu dropdown.
 *
 * CADANGAN WAJIB. Bila MasterData belum memuat tipe yang diminta, hook ini
 * memulangkan `cadangan`. Dropdown kosong lebih buruk daripada daftar keras
 * yang digantikan: pengguna kehilangan kemampuan mengisi field itu sama sekali,
 * dan tidak ada pesan yang menjelaskan kenapa.
 */
export function useMasterOptions(tipe: string, cadangan: string[]): string[] {
  const masterData = useAppStore((s) => s.masterData);
  return useMemo(() => {
    const dari = (masterData || [])
      .filter((m) => m.type === tipe)
      .map((m) => m.label)
      .filter(Boolean) as string[];
    return dari.length ? dari : cadangan;
  }, [masterData, tipe, cadangan]);
}

export interface OpsiMaster {
  id: string;
  label: string;
  icon?: string;
  color?: string;
}

/**
 * Varian untuk StyledDropdown, lengkap dengan ikon dan warna dari MasterData.
 *
 * `id` sengaja memakai LABEL, bukan `code`, karena itulah yang tersimpan di
 * kolom terkait: `Sprints.status` berisi `planned`, `QATestSuites.phase`
 * berisi `SIT`. Memakai `code` akan memutus data yang sudah ada.
 */
export function useMasterOptionItems(tipe: string, cadangan: OpsiMaster[]): OpsiMaster[] {
  const masterData = useAppStore((s) => s.masterData);
  return useMemo(() => {
    const dari = (masterData || [])
      .filter((m) => m.type === tipe && m.label)
      .map((m) => ({
        id: m.label as string,
        label: m.label as string,
        icon: (m as { icon?: string }).icon,
        color: (m as { color?: string }).color,
      }));
    return dari.length ? dari : cadangan;
  }, [masterData, tipe, cadangan]);
}
