/**
 * Test kebijakan autosave papan flowchart (#538).
 *
 * Yang diuji di sini BUKAN pengiriman jaringan, melainkan KAPAN papan boleh
 * mengirim dan kapan tidak: beberapa detik sesudah isi berubah (bukan tiap
 * piksel seretan), tidak untuk isi yang sudah ada di server, tidak saat ada
 * bentuk yang masih dipegang, tidak untuk papan baca-saja, dan tidak menumpuk
 * dua kiriman di jaringan lambat. Penjaga-penjaga inilah yang membuat autosave
 * aman dibiarkan menyala terus.
 *
 * Hook-nya diuji sendiri, bukan lewat FlowchartView, karena komponen itu
 * ±3.900 baris dan satu mount terukur ±1,3 detik. Rantai aslinya (sampai ke
 * tombol dock) diuji di FlowchartContainer.autosave.test.tsx.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { useFlowchartAutosave } from "./useFlowchartAutosave";

const JEDA = 20;

function pasang({
  isi: isiAwal = { x: 0 },
  papan: papanAwal = "fw1",
  boleh = true,
  diseret = false,
  kirim,
}: {
  isi?: unknown;
  papan?: string | null;
  boleh?: boolean;
  diseret?: boolean;
  kirim?: jest.Mock;
} = {}) {
  // Pencatatan dilakukan di harness, bukan di bawaan mock, supaya test yang
  // membawa mock sendiri (jaringan lambat / gagal) tetap bisa dibaca urutannya.
  const terkirim: string[] = [];
  const kirimMock = kirim ?? jest.fn().mockResolvedValue(undefined);
  const nowProp = { isi: isiAwal, papan: papanAwal, boleh, diseret };

  const hasil = renderHook(
    (p: { isi: unknown; papan: string | null; boleh: boolean; diseret: boolean }) =>
      useFlowchartAutosave({
        isi: p.isi,
        boleh: p.boleh,
        papan: p.papan,
        diseret: p.diseret,
        kirim: (isi: string) => {
          terkirim.push(isi);
          return kirimMock(isi);
        },
        jedaMs: JEDA,
      }),
    { initialProps: nowProp }
  );

  const ubah = (
    baru: unknown,
    atasinya: Partial<{ papan: string | null; boleh: boolean; diseret: boolean }> = {}
  ) => {
    nowProp.isi = baru;
    nowProp.papan = atasinya.papan ?? nowProp.papan;
    nowProp.boleh = atasinya.boleh ?? nowProp.boleh;
    nowProp.diseret = atasinya.diseret ?? nowProp.diseret;
    hasil.rerender(nowProp);
  };

  return { hasil, kirimMock, terkirim, ubah };
}

const tunggu = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("useFlowchartAutosave — kapan papan mengirim (#538)", () => {
  it("membuka papan tidak memicu satu tulisan pun", async () => {
    const { kirimMock } = pasang();
    await tunggu(JEDA * 5);
    expect(kirimMock).not.toHaveBeenCalled();
  });

  it("mengirim sekali setelah papan diam, lalu berhenti", async () => {
    const { hasil, kirimMock, ubah } = pasang();
    act(() => ubah({ x: 1 }));
    expect(hasil.result.current.status).toBe("diam");

    await waitFor(() => expect(hasil.result.current.status).toBe("tersimpan"));
    expect(hasil.result.current.jam).toBeInstanceOf(Date);
    await tunggu(JEDA * 5);
    expect(kirimMock).toHaveBeenCalledTimes(1);
  });

  it("seretan panjang hanya berangkat sekali, dengan isi terbaru", async () => {
    const { hasil, kirimMock, terkirim, ubah } = pasang();
    for (const x of [1, 2, 3, 4, 5]) act(() => ubah({ x }));
    await waitFor(() => expect(hasil.result.current.status).toBe("tersimpan"));
    expect(kirimMock).toHaveBeenCalledTimes(1);
    expect(terkirim[terkirim.length - 1]).toBe(JSON.stringify({ x: 5 }));
  });

  it("seretan yang masih dipegang tidak dikirim; lepas pegangan baru dikirim", async () => {
    const { hasil, kirimMock, ubah } = pasang();
    act(() => ubah({ x: 1 }, { diseret: true }));
    await tunggu(JEDA * 5);
    expect(kirimMock).not.toHaveBeenCalled();

    act(() => ubah({ x: 1 }, { diseret: false }));
    await waitFor(() => expect(hasil.result.current.status).toBe("tersimpan"));
    expect(kirimMock).toHaveBeenCalledTimes(1);
  });

  it("papan baca-saja tidak pernah menulis ke server", async () => {
    const { hasil, kirimMock, ubah } = pasang({ boleh: false });
    act(() => ubah({ x: 1 }));
    await waitFor(() => expect(hasil.result.current.status).toBe("diam"));
    await tunggu(JEDA * 5);
    expect(kirimMock).not.toHaveBeenCalled();
  });

  it("pindah papan tidak mengirim isi yang baru dimuat", async () => {
    const { kirimMock, ubah } = pasang();
    act(() => ubah({ x: 99 }, { papan: "fw2" }));
    await tunggu(JEDA * 5);
    expect(kirimMock).not.toHaveBeenCalled();
  });

  it("isi baru saat kiriman masih di udara berangkat sesudahnya, urutan tetap", async () => {
    let lepaskan: (() => void) | null = null;
    const kirimMock = jest.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          lepaskan = resolve;
        })
    );
    const { hasil, terkirim, ubah } = pasang({ kirim: kirimMock });

    act(() => ubah({ x: 1 }));
    await waitFor(() => expect(kirimMock).toHaveBeenCalledTimes(1));

    act(() => ubah({ x: 2 }));
    await tunggu(JEDA * 5);
    expect(kirimMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      lepaskan?.();
    });
    await waitFor(() => expect(kirimMock).toHaveBeenCalledTimes(2));
    await act(async () => {
      lepaskan?.();
    });
    await waitFor(() => expect(hasil.result.current.status).toBe("tersimpan"));
    expect(terkirim).toEqual([JSON.stringify({ x: 1 }), JSON.stringify({ x: 2 })]);
  });

  it("kiriman gagal tidak menghapus percobaan berikutnya", async () => {
    let gagal = true;
    const kirimMock = jest.fn().mockImplementation(() => {
      if (gagal) return Promise.reject(new Error("503 service unavailable"));
      return Promise.resolve();
    });
    const { hasil, ubah } = pasang({ kirim: kirimMock });

    act(() => ubah({ x: 1 }));
    await waitFor(() => expect(hasil.result.current.status).toBe("gagal"));
    expect(kirimMock).toHaveBeenCalledTimes(1);

    gagal = false;
    act(() => ubah({ x: 2 }));
    await waitFor(() => expect(hasil.result.current.status).toBe("tersimpan"));
    expect(kirimMock).toHaveBeenCalledTimes(2);
  });

  it("setelah Simpan manual, isi yang sama tidak dikirim ulang", async () => {
    const { hasil, kirimMock, ubah } = pasang();
    act(() => ubah({ x: 1 }));
    await waitFor(() => expect(hasil.result.current.status).toBe("tersimpan"));
    await tunggu(JEDA * 5);

    act(() => hasil.result.current.tandaiTersimpan());
    await tunggu(JEDA * 5);
    expect(kirimMock).toHaveBeenCalledTimes(1);
  });
});
