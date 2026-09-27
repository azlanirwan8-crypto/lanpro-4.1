import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Berapa lama papan harus diam sebelum satu kiriman otomatis dilepas.
 *
 * 4 detik dipilih dari sisi biaya: satu tarikan garis panjang (menyeret node
 * melewati beberapa node lain) tetap berakhir sebagai SATU kiriman, bukan satu
 * per piksel. Salinan penuh papan tetap ditulis ke LocalStorage tiap 1,5 detik
 * di FlowchartContainer, jadi angka ini tidak menentukan seberapa aman kerja
 * pengguna — hanya seberapa cepat basis data ikut.
 */
const JEDA_AUTOSAVE_MS = 4000;

type Status = "diam" | "menyimpan" | "tersimpan" | "gagal";

const sandi = (v: unknown) => JSON.stringify(v);

/**
 * Autosave papan flowchart ke basis data.
 *
 * Kenapa jadi hook terpisah: kebijakannya yang rawan bug (kapan boleh kirim,
 * kapan harus diam), bukan pekerjaannya. Tombol Simpan manual dan pengiriman
 * saat keluar sudah ada sejak lama; yang hilang hanyalah pengiriman otomatis,
 * dan itu butuh tiga penjaga sekaligus: jangan kirim isi yang sama, jangan
 * potong seretan node yang masih berjalan, dan jangan menumpuk dua kiriman di
 * jaringan lambat.
 */
export function useFlowchartAutosave(params: {
  /** Isi papan; dibandingkan sebagai JSON untuk memutuskan perlu kirim atau tidak. */
  isi: unknown;
  /** Papan boleh ditulis DAN barisnya sungguh ada di basis data. */
  boleh: boolean;
  /** Ganti papan = ganti acuan; null bila belum ada papan yang dibuka. */
  papan: string | null;
  /** Ada bentuk yang sedang diseret atau diubah ukurannya. */
  diseret: boolean;
  /**
   * Satu kali pengiriman penuh ke server; menerima string isi yang sedang
   * berangkat supaya pemanggilnya bisa mencatat/membandingkan tanpa menebak.
   * Melempar bila gagal.
   */
  kirim: (isi: string) => Promise<void>;
  /** Hanya untuk test; bawaan 4 detik. */
  jedaMs?: number;
}) {
  const { isi, boleh, papan, diseret, kirim, jedaMs = JEDA_AUTOSAVE_MS } = params;

  const [status, setStatus] = useState<Status>("diam");
  const [jam, setJam] = useState<Date | null>(null);
  /** Snapshot yang terakhir mendarat di server (atau yang baru saja dimuat). */
  const acuan = useRef<string | null>(null);
  const terbaru = useRef(isi);
  const berjalan = useRef(false);
  /** Ada isi lebih baru yang datang saat sebuah kiriman masih di udara. */
  const ulangi = useRef(false);

  const kirimRef = useRef(kirim);

  // Ditulis di dalam efek, bukan di badan render, dan TANPA daftar dependensi:
  // `coba` tidak boleh berubah identitas tiap render (kalau berubah, timer di
  // bawah ikut dipasang ulang dan jeda tidak pernah habis), sementara yang harus
  // dibaca saat timer berbunyi adalah papan yang terbaru.
  useEffect(() => {
    kirimRef.current = kirim;
    terbaru.current = isi;
  });

  const coba = useCallback(async () => {
    const snapshot = sandi(terbaru.current);
    if (snapshot === acuan.current) return;
    if (berjalan.current) {
      ulangi.current = true;
      return;
    }
    berjalan.current = true;
    setStatus("menyimpan");
    try {
      await kirimRef.current(snapshot);
      acuan.current = snapshot;
      setStatus("tersimpan");
      setJam(new Date());
    } catch {
      setStatus("gagal");
    } finally {
      berjalan.current = false;
      if (ulangi.current) {
        ulangi.current = false;
        await coba();
      }
    }
  }, []);

  // Dipanggil jalur manual supaya autosave tidak mengirim ulang isi yang
  // barusan sama.
  const tandaiTersimpan = useCallback(() => {
    acuan.current = sandi(terbaru.current);
    setStatus("tersimpan");
    setJam(new Date());
  }, []);

  useEffect(() => {
    acuan.current = sandi(terbaru.current);
    setStatus("diam");
    setJam(null);
  }, [papan]);

  useEffect(() => {
    if (!boleh || diseret) return;
    const timer = setTimeout(() => {
      void coba();
    }, jedaMs);
    return () => clearTimeout(timer);
  }, [boleh, diseret, isi, jedaMs, coba]);

  return { status, jam, tandaiTersimpan };
}
