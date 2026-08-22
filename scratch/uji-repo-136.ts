import { documentRepository } from "../server/repositories/document.repository";
(async () => {
  const rows = await documentRepository.findByProjectId("2SGXiPUTwHnF8D576hfO");
  const f = rows.filter((r: any) => r.type === "flowchart");
  console.log("flowchart ditemukan:", f.length);
  for (const r of f) {
    const c = (r as any).canvasData || "";
    console.log({
      title: r.title,
      description: r.description,
      punyaCanvas: !!c,
      panjangCanvas: c.length,
      nodeTerbaca: c ? (JSON.parse(c).nodes || []).length : 0,
    });
  }
  process.exit(0);
})().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
