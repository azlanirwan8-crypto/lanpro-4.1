/**
 * Konstanta deskriptif untuk panel manajemen pengguna.
 *
 * Diekstrak apa adanya dari index.tsx (Fase 3 — Anti-God-Object).
 *
 * Berekstensi .tsx karena ROLE_DESCRIPTIONS memuat elemen ikon (JSX).
 * Selebihnya data murni tanpa state maupun efek samping.
 */

import React from "react";
import { Award, Eye, ShieldCheck, UserCog, Users } from "lucide-react";
import type { PeranEfektif } from "../../types";

export const MODULE_DESCRIPTIONS: Record<string, { label: string; desc: string }> = {
  dashboard: {
    label: "Dashboard",
    desc: "Menyajikan ringkasan menyeluruh atas alur kerja aktif, tugas sprint, metrik progres, dan kesehatan ruang kerja secara umum.",
  },
  meetingNotes: {
    label: "Catatan Rapat",
    desc: "Pusat kolaborasi untuk catatan rapat, mencatat pokok pembahasan, membagi tindak lanjut, dan melacak keputusan.",
  },
  wiki: {
    label: "Dokumentasi",
    desc: "Pusat kolaborasi untuk dokumentasi proyek dan berbagi pengetahuan.",
  },
  flowchart: {
    label: "Editor Diagram Alur",
    desc: "Perkakas interaktif untuk membuat, menyunting, dan memetakan alur kerja serta diagram proses proyek.",
  },
  list: {
    label: "Daftar Isu",
    desc: "Daftar utama untuk melaporkan bug, menulis user story, merencanakan tugas, dan menyaring seluruh ruang kerja.",
  },
  sprints: {
    label: "Perencanaan",
    desc: "Dipakai manajer untuk mengelola backlog sprint, menjadwalkan target, menyesuaikan milestone, dan menjalankan sesi perencanaan.",
  },
  board: {
    label: "Papan Kanban",
    desc: "Kolom visual dan interaktif untuk sprint aktif, tempat anggota memindahkan tugas melintasi tahap In Progress, Review, dan Done.",
  },
  qa: {
    label: "Penilaian Kualitas",
    desc: "Mengelola skenario uji, kasus uji, dan alur penjaminan kualitas untuk modul proyek.",
  },
  timeline: {
    label: "Peta Jalan",
    desc: "Perencanaan interaktif bergaya Gantt yang menampilkan jadwal epic, ketergantungan, dan urutan peluncuran produk.",
  },
  access: {
    label: "Tim",
    desc: "Memberi manajer gambaran jelas soal beban kerja engineer, matriks peran, peta keahlian, dan kapasitas anggota tim.",
  },
  userManagement: {
    label: "Manajemen Pengguna",
    desc: "Mengelola akses, peran, dan izin pengguna.",
  },
  masterData: {
    label: "Master Data",
    desc: "Mengelola data inti sistem.",
  },
  auditLog: {
    label: "Audit Perusahaan",
    desc: "Pencatatan keamanan sangat rinci yang melacak seluruh perubahan struktur, penghapusan, pembaruan, dan aksi basis data.",
  },
  dbExplorer: {
    label: "DB Explorer",
    desc: "Direct database access and exploration tool.",
  },
  settings: {
    label: "Integration Settings",
    desc: "Manages Email and WhatsApp integration configurations.",
  },
};

/**
 * Keterangan peran untuk layar admin.
 *
 * `Partial` karena isinya memang belum lengkap: 5 dari 12 peran katalog. Tujuh
 * peran proyek belum punya keterangan, dan `manager` di sini adalah peran
 * PROYEK yang ikut tampil lewat `effectiveRole` — karena itu kuncinya
 * `PeranEfektif`, bukan `AppRole`.
 */
export const ROLE_DESCRIPTIONS: Partial<
  Record<PeranEfektif, { label: string; badgeColor: string; icon: React.ReactNode; desc: string }>
> = {
  admin: {
    label: "Administrator",
    badgeColor: "bg-rose-500/10 border-rose-500/30 text-rose-700",
    icon: <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />,
    desc: "Melewati seluruh gerbang kendali. Diberi akses penuh baca, buat, ubah, dan hapus di semua modul, pengaturan, dan ruang kerja tim.",
  },
  head: {
    label: "Kepala Departemen",
    badgeColor: "bg-purple-500/10 border-purple-500/30 text-purple-700",
    icon: <Award className="w-4 h-4 text-purple-600 shrink-0" />,
    desc: "Mengawasi unit bisnis secara utuh. Dapat menelusuri metrik, berkolaborasi di dokumentasi, meninjau layar audit, dan memeriksa operasional.",
  },
  manager: {
    label: "Manajer Proyek",
    badgeColor: "bg-blue-500/10 border-blue-500/30 text-blue-700",
    icon: <UserCog className="w-4 h-4 text-blue-600 shrink-0" />,
    desc: "Ditugaskan menjalankan lingkup proyek tertentu, menyusun spesifikasi tugas, membuka sprint, meninjau daftar periksa PR, dan mengarahkan penugasan developer.",
  },
  user: {
    label: "Pengguna Standar",
    badgeColor: "bg-indigo-500/10 border-indigo-500/30 text-indigo-700",
    icon: <Users className="w-4 h-4 text-indigo-600 shrink-0" />,
    desc: "Kolaborator inti. Berwenang menulis isu, memindahkan kartu antarkolom, ikut membahas, dan menugaskan pekerjaan kepada dirinya sendiri.",
  },
  viewer: {
    label: "Observer",
    badgeColor: "bg-surface-muted border-border-subtle text-content-body",
    icon: <Eye className="w-4 h-4 text-content-secondary shrink-0" />,
    desc: "Read-only workspace access. Best suited for clients, corporate stakeholders, or general auditors who need high visibility into work items.",
  },
};

export const ACTION_DESCRIPTIONS = {
  read: "Read: View permission to browse, search, and load module entries.",
  create: "Create: Modification privilege to write and add new records.",
  update: "Update: Modification privilege to edit and refine existing entries.",
  delete: "Delete: Destructive privilege to permanently purge data or archive entities.",
};
