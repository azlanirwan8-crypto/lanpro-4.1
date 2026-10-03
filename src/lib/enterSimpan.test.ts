import { enterUntukSimpan } from "./enterSimpan";

type Palsu = { key: string; nativeEvent: { isComposing: boolean }; preventDefault: jest.Mock };

const peristiwa = (key: string, isComposing = false): Palsu => ({
  key,
  nativeEvent: { isComposing },
  preventDefault: jest.fn(),
});

describe("enterUntukSimpan (#592)", () => {
  it("Enter memanggil jalurnya satu kali dan mencegah tindakan bawaan", () => {
    const jalan = jest.fn();
    const e = peristiwa("Enter");
    enterUntukSimpan(jalan)(e as never);
    expect(jalan).toHaveBeenCalledTimes(1);
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("Enter dari komposisi IME tidak menyimpan", () => {
    const jalan = jest.fn();
    enterUntukSimpan(jalan)(peristiwa("Enter", true) as never);
    expect(jalan).not.toHaveBeenCalled();
  });

  it("tombol lain tidak menyimpan dan tidak dibajak", () => {
    const jalan = jest.fn();
    const e = peristiwa("a");
    enterUntukSimpan(jalan)(e as never);
    expect(jalan).not.toHaveBeenCalled();
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});
