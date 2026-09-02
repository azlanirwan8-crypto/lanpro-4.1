/**
 * #330 — Log Aktivitas harus ada di sidebarSections dengan id `activity`.
 */
import { sidebarSections } from "./config";

describe("sidebar config #330", () => {
  it("memuat item activity di seksi administration", () => {
    const admin = sidebarSections.find((s) => s.id === "administration");
    expect(admin).toBeTruthy();
    const activity = admin!.items.find((i) => i.id === "activity");
    expect(activity).toMatchObject({
      id: "activity",
      label: "sidebar.activityLog",
      module: "dashboard",
      butuhProyek: true,
    });
  });
});
