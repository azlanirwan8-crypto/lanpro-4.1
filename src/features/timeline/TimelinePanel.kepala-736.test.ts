import { readFileSync } from "fs";
import { join } from "path";

/** #736 — kepala minggu pane kanan TIDAK boleh bergantung `sticky`: ia duduk
 *  DI LUAR scroller vertikal (`timelineMainBodyRef`) sehingga tidak mungkin
 *  ikut tergulir bersama baris. Penjaga ini membaca SUMBER karena gerbang
 *  gaya buta terhadap struktur scroller (preseden `kepalaTabel-606.test.ts`). */
const src = readFileSync(join(__dirname, "TimelinePanel.tsx"), "utf8");

describe("#736 — kepala minggu pane kanan tetap saat baris tergulir", () => {
  it("scroller vertikal pane kanan adalah elemen terpisah ber-ref body", () => {
    expect(src).toContain("const timelineMainBodyRef = useRef<HTMLDivElement>(null);");
    expect(src).toMatch(/ref=\{timelineMainBodyRef\}[\s\S]{0,220}?overflow-y-auto/);
  });

  it("kepala minggu bukan lagi elemen sticky di dalam scroller", () => {
    expect(src).not.toMatch(/sticky top-0 z-30 h-\[73px\]/);
  });

  it("sinkron vertikal kiri-kanan memakai body ref, bukan main ref", () => {
    const mulai = src.indexOf("const handleTimelineVerticalScroll");
    const selesai = src.indexOf("const exportTimelineToPng");
    const sync = src.slice(mulai, selesai);
    expect(sync).toContain("timelineMainBodyRef.current");
    expect(sync).not.toContain("target === timelineMainRef.current");
  });

  it("scroller horizontal pane kanan tidak ikut menggulir vertikal", () => {
    expect(src).toContain("overflow-x-auto overflow-y-hidden relative bg-surface min-w-0");
  });
});
