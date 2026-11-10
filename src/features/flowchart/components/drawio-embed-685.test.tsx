/**
 * @jest-environment jsdom
 *
 * #685 — jembatan editor draw.io.
 *
 * Yang diuji di sini adalah BATAS KEPERCAYAAN dan alur simpan, bukan tampilan
 * draw.io itu sendiri (build-nya tidak ada di jsdom). Empat hal yang tidak boleh
 * longgar: pesan dari origin lain ditolak, pesan dari iframe lain ditolak,
 * autosave benar-benar dikirim ke `onSimpan`, dan menutup editor tidak membuang
 * suntingan yang belum sempat terkirim.
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { DrawioEmbed } from "./DrawioEmbed";
import i18n from "../../../i18n";

const XML =
  '<mxfile><diagram id="p1" name="Page-1"><mxGraphModel><root /></mxGraphModel></diagram></mxfile>';

type Props = React.ComponentProps<typeof DrawioEmbed>;

const props = (partial: Partial<Props> = {}): Props => ({
  isOpen: true,
  xml: XML,
  judul: "Papan Uji",
  onSimpan: jest.fn().mockResolvedValue(undefined),
  onTutup: jest.fn(),
  ...partial,
});

const iframe = () => screen.getByTestId("drawio-embed-iframe") as HTMLIFrameElement;

const kirimDariEditor = (pesan: unknown, opsi: { origin?: string; source?: any } = {}) => {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: typeof pesan === "string" ? pesan : JSON.stringify(pesan),
        origin: opsi.origin ?? window.location.origin,
        source: opsi.source ?? iframe().contentWindow,
      })
    );
  });
};

afterEach(() => {
  jest.useRealTimers();
});

describe("#685 DrawioEmbed", () => {
  it("memuat build patok dari origin yang sama, bukan CDN", () => {
    render(<DrawioEmbed {...props()} />);
    const src = iframe().getAttribute("src") ?? "";
    expect(src.startsWith("/drawio/index.html?")).toBe(true);
    expect(src).toContain("proto=json");
    expect(src).toContain("embed=1");
    expect(src).not.toMatch(/^https?:/);
  });

  it("init dari iframe menjawab load dengan XML sumber", () => {
    render(<DrawioEmbed {...props()} />);
    const frame = iframe();
    const post = jest.spyOn(frame.contentWindow as Window, "postMessage");

    kirimDariEditor({ event: "init" });

    expect(post).toHaveBeenCalledTimes(1);
    const [pesan, target] = post.mock.calls[0];
    expect(target).toBe(window.location.origin);
    expect(JSON.parse(String(pesan))).toMatchObject({
      action: "load",
      xml: XML,
      autosave: 1,
      title: "Papan Uji",
    });
  });

  it("menolak pesan dari origin lain", () => {
    const onSimpan = jest.fn().mockResolvedValue(undefined);
    render(<DrawioEmbed {...props({ onSimpan })} />);
    jest.useFakeTimers();

    kirimDariEditor({ event: "autosave", xml: XML }, { origin: "https://jahat.example" });
    act(() => jest.advanceTimersByTime(1000));

    expect(onSimpan).not.toHaveBeenCalled();
  });

  it("menolak pesan dari iframe lain", () => {
    const onSimpan = jest.fn().mockResolvedValue(undefined);
    render(<DrawioEmbed {...props({ onSimpan })} />);
    jest.useFakeTimers();
    const iframeLain = document.createElement("iframe");
    document.body.appendChild(iframeLain);

    kirimDariEditor(
      { event: "autosave", xml: XML },
      { source: iframeLain.contentWindow as Window }
    );
    act(() => jest.advanceTimersByTime(1000));

    expect(onSimpan).not.toHaveBeenCalled();
    iframeLain.remove();
  });

  it("autosave mengirim XML apa adanya sesudah jeda", async () => {
    const onSimpan = jest.fn().mockResolvedValue(undefined);
    render(<DrawioEmbed {...props({ onSimpan })} />);
    jest.useFakeTimers();

    kirimDariEditor({ event: "autosave", xml: `${XML}\n` });
    await act(async () => {
      jest.advanceTimersByTime(700);
      await Promise.resolve();
    });

    expect(onSimpan).toHaveBeenCalledTimes(1);
    expect(onSimpan).toHaveBeenCalledWith(`${XML}\n`);
    expect(screen.getByTestId("drawio-embed-status")).toHaveTextContent(
      i18n.t("flowchart.drawioTersimpan")
    );
  });

  it("menutup editor menyimpan suntingan yang belum melewati jeda", async () => {
    const onSimpan = jest.fn().mockResolvedValue(undefined);
    const onTutup = jest.fn();
    render(<DrawioEmbed {...props({ onSimpan, onTutup })} />);
    jest.useFakeTimers();

    kirimDariEditor({ event: "autosave", xml: XML });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Close"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onSimpan).toHaveBeenCalledWith(XML);
    expect(onTutup).toHaveBeenCalledTimes(1);
  });

  it("simpan yang gagal tidak menutup editor dan bisa diulang", async () => {
    const onSimpan = jest
      .fn()
      .mockRejectedValueOnce(new Error("server menolak"))
      .mockResolvedValueOnce(undefined);
    const onTutup = jest.fn();
    render(<DrawioEmbed {...props({ onSimpan, onTutup })} />);
    jest.useFakeTimers();

    kirimDariEditor({ event: "autosave", xml: XML });
    await act(async () => {
      jest.advanceTimersByTime(700);
      await Promise.resolve();
    });

    expect(onSimpan).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("drawio-embed-status")).toHaveTextContent(
      i18n.t("flowchart.drawioGagalMenyimpan")
    );

    await act(async () => {
      fireEvent.click(screen.getByText(i18n.t("flowchart.drawioSimpanUlang")));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onSimpan).toHaveBeenCalledTimes(2);
    expect(onSimpan).toHaveBeenLastCalledWith(XML);
    expect(onTutup).not.toHaveBeenCalled();
  });

  it("editor yang tidak pernah init menampilkan galat dan bisa dimuat ulang", () => {
    jest.useFakeTimers();
    render(<DrawioEmbed {...props()} />);

    act(() => jest.advanceTimersByTime(20_000));
    expect(screen.getByTestId("drawio-embed-status")).toHaveTextContent(
      i18n.t("flowchart.drawioGagalMuat")
    );

    act(() => {
      fireEvent.click(screen.getByText(i18n.t("flowchart.drawioCobaLagi")));
    });
    expect(iframe().getAttribute("src")).toContain("r=1");
  });
});
