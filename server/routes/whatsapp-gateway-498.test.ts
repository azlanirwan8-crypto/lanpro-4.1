/**
 * Test #498: WhatsApp Gateway Real Connection Test & Broadcast Now Trigger
 *
 * Memastikan:
 * 1. Endpoint POST /api/settings/whatsapp/test ada dan dijaga verifyGlobalAdmin.
 * 2. Endpoint POST /api/settings/whatsapp/broadcast-now ada dan dijaga verifyGlobalAdmin.
 * 3. whatsapp.service.ts mengekspor sendSingleWhatsAppMessage dan sendDailyTaskDigest.
 * 4. settings.service.ts memiliki testWhatsAppConnection dan sendWhatsAppBroadcastNow.
 * 5. WhatsAppConfigForm.tsx memanggil testWhatsAppConnection (bukan mock lokal) dan memiliki tombol Kirim Sekarang.
 */
import fs from "node:fs";
import path from "node:path";

describe("Item #498: WhatsApp Gateway Real Test & Broadcast Now", () => {
  const routesPath = path.resolve(__dirname, "./system.routes.ts");
  const servicePath = path.resolve(__dirname, "../services/whatsapp.service.ts");
  const frontendServicePath = path.resolve(
    __dirname,
    "../../src/features/settings/services/settings.service.ts"
  );
  const formPath = path.resolve(
    __dirname,
    "../../src/features/settings/components/WhatsAppConfigForm.tsx"
  );

  const routesContent = fs.readFileSync(routesPath, "utf8");
  const serviceContent = fs.readFileSync(servicePath, "utf8");
  const frontendServiceContent = fs.readFileSync(frontendServicePath, "utf8");
  const formContent = fs.readFileSync(formPath, "utf8");

  it("memastikan rute POST /api/settings/whatsapp/test terdaftar dan dijaga verifyGlobalAdmin", () => {
    expect(routesContent).toMatch(
      /router\.post\(\s*["']\/api\/settings\/whatsapp\/test["']\s*,\s*verifyGlobalAdmin/
    );
    expect(routesContent).toContain("sendSingleWhatsAppMessage");
    expect(routesContent).toContain("nomor_tujuan_tidak_valid");
  });

  it("memastikan rute POST /api/settings/whatsapp/broadcast-now terdaftar dan dijaga verifyGlobalAdmin", () => {
    expect(routesContent).toMatch(
      /router\.post\(\s*["']\/api\/settings\/whatsapp\/broadcast-now["']\s*,\s*verifyGlobalAdmin/
    );
    expect(routesContent).toContain("sendDailyTaskDigest");
  });

  it("memastikan whatsapp.service.ts mengekspor sendSingleWhatsAppMessage dan sendDailyTaskDigest", () => {
    expect(serviceContent).toContain("export async function sendSingleWhatsAppMessage");
    expect(serviceContent).toContain("export async function sendDailyTaskDigest");
  });

  it("memastikan settings.service.ts mendefinisikan testWhatsAppConnection dan sendWhatsAppBroadcastNow", () => {
    expect(frontendServiceContent).toContain("export async function testWhatsAppConnection");
    expect(frontendServiceContent).toContain("export async function sendWhatsAppBroadcastNow");
    expect(frontendServiceContent).toContain('apiRequest("/api/settings/whatsapp/test"');
    expect(frontendServiceContent).toContain('apiRequest("/api/settings/whatsapp/broadcast-now"');
  });

  it("memastikan WhatsAppConfigForm.tsx memanggil testWhatsAppConnection dan sendWhatsAppBroadcastNow", () => {
    expect(formContent).toContain("testWhatsAppConnection");
    expect(formContent).toContain("sendWhatsAppBroadcastNow");
    expect(formContent).toContain("handleBroadcastNow");
    expect(formContent).not.toContain("// Mock API Call");
  });
});
