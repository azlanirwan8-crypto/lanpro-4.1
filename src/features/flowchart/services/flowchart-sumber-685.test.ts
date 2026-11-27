/**
 * #685 — sumber kanonik melewati siklus simpan/muat, dan payload lama tidak
 * berubah bentuk.
 *
 * Ini acceptance criteria A: unggah → simpan → muat ulang harus menghasilkan
 * byte yang sama. Yang diuji di sini BUKAN string sementara di dalam test,
 * melainkan fungsi susun/muat yang benar-benar dipakai tombol Simpan dan
 * autosave — jadi ambang ukuran dan discriminator ikut terbukti.
 */
jest.mock("../../../lib/api", () => ({
  __esModule: true,
  apiRequest: jest.fn(),
}));

import { apiRequest } from "../../../lib/api";
import { createFlowchart, fetchFlowcharts, susunPayload, updateFlowchart } from "./flowchart.service";

const SUMBER =
  '<mxfile host="app.diagrams.net" version="24.0.0"><diagram id="p" name="Alur">' +
  '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  '<mxCell id="2" value="Mulai" vertex="1" parent="1">' +
  '<mxGeometry x="40" y="20" width="100" height="50" as="geometry"/></mxCell>' +
  "</root></mxGraphModel></diagram></mxfile>";

const papan = {
  nodes: [{ id: "n1", label: "Mulai", x: 40, y: 20, width: 100, height: 50 }],
  edges: [],
};

describe("#685 payload papan menyimpan sumber .drawio", () => {
  it("sumber dan discriminator tertulis, dan flag-nya benar", () => {
    const { payload, sumberIkutTersimpan } = susunPayload({ ...papan, sumberDrawio: SUMBER });
    const isi = JSON.parse(payload);

    expect(sumberIkutTersimpan).toBe(true);
    expect(isi.formatSumber).toBe("drawio-xml-v1");
    expect(isi.sumberDrawio).toBe(SUMBER);
    expect(isi.nodes).toHaveLength(1);
  });

  it("muat-ulang mengembalikan byte yang sama persis (bukan hasil render ulang)", async () => {
    const { payload } = susunPayload({ ...papan, sumberDrawio: SUMBER });
    (apiRequest as jest.Mock).mockResolvedValue({
      status: "success",
      data: [
        {
          id: "f1",
          type: "flowchart",
          title: "Alur",
          canvasData: payload,
          updatedAt: "2026-10-10T00:00:00.000Z",
        },
      ],
    });

    const [hasil] = await fetchFlowcharts("proj-1");
    expect(hasil.sumberDrawio).toBe(SUMBER);
    expect(hasil.formatSumber).toBe("drawio-xml-v1");
    // Ekspor-ulang sumber = byte yang sama; inilah yang tidak bisa dipenuhi
    // `eksporDrawio()` karena ia MENULIS mxfile baru dari model native.
    expect(hasil.sumberDrawio).not.toContain('host="LanPro"');
    expect(hasil.editorDrawioUtama).toBeUndefined();
  });

  it("simpan dan muat diagram utama mempertahankan XML sumber dan mode editor", async () => {
    const api = apiRequest as jest.Mock;
    const sumber = SUMBER.replace(
      'value="Mulai"',
      'value="Mulai" style="fontFamily=Georgia;fontSize=24;fontStyle=3;"'
    );
    const diagram = {
      name: "Alur",
      description: "",
      theme: "miro" as const,
      nodes: [],
      edges: [],
      sumberDrawio: sumber,
      editorDrawioUtama: true,
    };
    api.mockResolvedValueOnce({ status: "success", data: { id: "f1" } });
    await expect(createFlowchart("proj-1", diagram)).resolves.toBe("f1");

    const canvasData = api.mock.calls[0][1].body.canvasData;
    api.mockResolvedValueOnce({ data: [{ id: "f1", type: "flowchart", title: "Alur", canvasData }] });
    await expect(fetchFlowcharts("proj-1")).resolves.toEqual([
      expect.objectContaining({ sumberDrawio: sumber, editorDrawioUtama: true }),
    ]);
  });

  it("menolak pembaruan diagram utama jika sumber tidak ikut tersimpan", async () => {
    const api = apiRequest as jest.Mock;
    await expect(
      updateFlowchart("proj-1", "f1", { ...papan, name: "Alur", editorDrawioUtama: true })
    ).rejects.toThrow();
    expect(api).not.toHaveBeenCalled();
  });

  it("payload lama tetap terbaca dan TIDAK ditambahi sumber saat ditulis balik", () => {
    const { payload, sumberIkutTersimpan } = susunPayload(papan);
    expect(sumberIkutTersimpan).toBe(false);
    expect(JSON.parse(payload)).not.toHaveProperty("sumberDrawio");
    expect(JSON.parse(payload)).not.toHaveProperty("formatSumber");
  });

  it("format sumber tanpa discriminator tidak dipercaya", async () => {
    const palsu = JSON.stringify({ ...papan, sumberDrawio: SUMBER, formatSumber: "selain-kita" });
    (apiRequest as jest.Mock).mockResolvedValue({
      status: "success",
      data: [{ id: "f2", type: "flowchart", title: "X", canvasData: palsu, updatedAt: "" }],
    });
    const [hasil] = await fetchFlowcharts("proj-1");
    expect(hasil.sumberDrawio).toBeUndefined();
  });

  /**
   * Arah keputusan ketika tidak muat: yang dikorbankan SUMBERNYA, bukan
   * papan yang sedang diedit. Mengembalikan payload gemuk akan membuat server
   * menolak SEMUA penyimpanan (#584), dan pengguna kehilangan pekerjaan yang ada
   * di layar — jauh lebih mahal daripada kehilangan salinan berkas yang masih
   * ada di laptop mereka.
   */
  it("sumber yang tidak muat dibuang dengan flag, papan tetap tersimpan", () => {
    const raksasa = "<mxfile>" + "x".repeat(8 * 1024 * 1024) + "</mxfile>";
    const { payload, sumberIkutTersimpan } = susunPayload({ ...papan, sumberDrawio: raksasa });

    expect(sumberIkutTersimpan).toBe(false);
    expect(payload.length).toBeLessThan(8 * 1024 * 1024);
    expect(JSON.parse(payload).nodes).toHaveLength(1);
  });

  it("sumber yang muat di anggaran tetap ikut walau papannya besar", () => {
    const banyak = {
      nodes: Array.from({ length: 4000 }, (_, i) => ({ id: `n${i}`, x: i, y: i })),
      edges: [],
    };
    const { payload, sumberIkutTersimpan } = susunPayload({ ...banyak, sumberDrawio: SUMBER });
    expect(sumberIkutTersimpan).toBe(true);
    expect(payload.length).toBeLessThan(7.5 * 1024 * 1024);
  });
});
