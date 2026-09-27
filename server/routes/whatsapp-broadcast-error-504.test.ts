import fs from "fs";
import path from "path";

describe("Item #504 - Akurasi Pesan Error Broadcast WhatsApp", () => {
  it("whatsapp.service.ts mengekspor interface WhatsAppDigestResult dengan totalGagal dan kegagalan", () => {
    const servicePath = path.join(__dirname, "../services/whatsapp.service.ts");
    const serviceContent = fs.readFileSync(servicePath, "utf8");

    expect(serviceContent).toContain("export interface WhatsAppDigestResult");
    expect(serviceContent).toContain("totalGagal: number;");
    expect(serviceContent).toContain("totalTanpaTugas: number;");
    expect(serviceContent).toContain("kegagalan: WhatsAppDigestFailure[];");
  });

  it("whatsapp.service.ts mencatat error pengiriman ke totalGagal dan array kegagalan", () => {
    const servicePath = path.join(__dirname, "../services/whatsapp.service.ts");
    const serviceContent = fs.readFileSync(servicePath, "utf8");

    expect(serviceContent).toContain("totalGagal++;");
    expect(serviceContent).toContain("kegagalan.push({");
    expect(serviceContent).toContain("totalTanpaTugas++;");
  });

  it("system.routes.ts membedakan totalGagal dari totalTanpaTugas dan tidak menyalahkan tiket kosong saat gagal kirim", () => {
    const routesPath = path.join(__dirname, "../routes/system.routes.ts");
    const routesContent = fs.readFileSync(routesPath, "utf8");

    // Memeriksa penanganan error saat pengiriman gagal
    expect(routesContent).toContain("hasil.totalGagal > 0 && hasil.totalDikirim === 0");
    expect(routesContent).toContain("Gagal mengirim broadcast WhatsApp:");
    expect(routesContent).toContain("hasil.totalTanpaTugas > 0");
  });

  it("WhatsAppConfigForm.tsx memicu event broadcast-logs-updated baik saat sukses maupun gagal", () => {
    const formPath = path.join(
      __dirname,
      "../../src/features/settings/components/WhatsAppConfigForm.tsx"
    );
    const formContent = fs.readFileSync(formPath, "utf8");

    expect(formContent).toContain(
      'window.dispatchEvent(new CustomEvent("broadcast-logs-updated"))'
    );
  });
});
