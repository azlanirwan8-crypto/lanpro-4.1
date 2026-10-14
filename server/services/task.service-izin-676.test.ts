/**
 * #676 — langit-langit izin di SATU-SATUNYA tempat `Users.permissions`
 * ditegakkan server (§19.8 Tahap 6: 2 sel, `list.update` dan `list.delete`,
 * dipakai enam situs di `task.routes.ts`).
 *
 * Kondisi sebelum perbaikan: nilai custom MENGGANTIKAN bawaan peran
 * (`return !!customList[action]`), jadi `viewer` dengan `{"list":{"delete":true}}`
 * tersimpan di kolom JSON itu benar-benar bisa menghapus task lewat API.
 * Keputusan pemilik proyek 14 Okt: custom hanya boleh MENURUNKAN.
 *
 * Konsekuensi yang DISENGAJA dari aturan itu: plafon `user.list.delete` ikut
 * dinaikkan jadi `true` (opsi A), kalau tidak #483 mati — reporter/assignee
 * tak akan pernah bisa menghapus task miliknya sendiri. Kepemilikan dijaga
 * `bolehUbahTask` di rute, sebelum fungsi ini dipanggil.
 */

import { checkUserPermissionBackend } from "./task.service";

describe("#676 checkUserPermissionBackend — custom tidak bisa menaikkan", () => {
  it("viewer tidak bisa diberi delete", () => {
    expect(checkUserPermissionBackend("viewer", { list: { delete: true } }, "delete")).toBe(false);
  });

  it("viewer tidak bisa diberi update", () => {
    expect(checkUserPermissionBackend("viewer", { list: { update: true } }, "update")).toBe(false);
  });

  it("user: plafon delete sengaja dinaikkan (opsi A), jadi custom tidak menaikkan apa pun", () => {
    // #676 bertabrakan dengan #483: dengan plafon `false`, aturan "custom hanya
    // menurunkan" membuat reporter/assignee kehilangan hak hapus yang dijanjikan
    // #483. Keputusan pemilik 14 Okt = opsi A: plafon `user.list.delete` jadi
    // `true`, checklist berubah fungsi jadi PENCABUT. Kepemilikan task dijaga
    // `bolehUbahTask` sebelum fungsi ini dipanggil.
    expect(checkUserPermissionBackend("user", null, "delete")).toBe(true);
    expect(checkUserPermissionBackend("user", { list: { delete: true } }, "delete")).toBe(true);
    expect(checkUserPermissionBackend("user", { list: { delete: false } }, "delete")).toBe(false);
  });

  it("head tidak bisa diberi update maupun delete", () => {
    expect(checkUserPermissionBackend("head", { list: { update: true } }, "update")).toBe(false);
    expect(checkUserPermissionBackend("head", { list: { delete: true } }, "delete")).toBe(false);
  });

  it("kunci warisan `issueList` juga tidak bisa menaikkan", () => {
    expect(checkUserPermissionBackend("viewer", { issueList: { delete: true } }, "delete")).toBe(
      false
    );
  });

  it("peran tak dikenal jatuh ke viewer dan tetap tidak bisa dinaikkan", () => {
    expect(checkUserPermissionBackend("dukun", { list: { delete: true } }, "delete")).toBe(false);
    expect(checkUserPermissionBackend("", { list: { delete: true } }, "delete")).toBe(false);
  });

  it("custom berbentuk string warisan tidak bisa menaikkan", () => {
    expect(checkUserPermissionBackend("viewer", { list: "full" } as any, "delete")).toBe(false);
  });
});

describe("#676 checkUserPermissionBackend — custom TETAP bisa menurunkan", () => {
  it("admin kehilangan delete bila custom mencabutnya", () => {
    expect(checkUserPermissionBackend("admin", { list: { delete: false } }, "delete")).toBe(false);
  });

  it("manager kehilangan update bila custom mencabutnya", () => {
    expect(checkUserPermissionBackend("manager", { list: { update: false } }, "update")).toBe(
      false
    );
  });

  it("user kehilangan update bila custom mencabutnya", () => {
    expect(checkUserPermissionBackend("user", { list: { update: false } }, "update")).toBe(false);
  });
});

describe("#676 perilaku bawaan", () => {
  it("user boleh update dan boleh delete (satu-satunya bawaan yang berubah, opsi A)", () => {
    expect(checkUserPermissionBackend("user", null, "update")).toBe(true);
    expect(checkUserPermissionBackend("user", null, "delete")).toBe(true);
  });

  it("head dan viewer tetap tidak boleh update maupun delete", () => {
    expect(checkUserPermissionBackend("head", null, "update")).toBe(false);
    expect(checkUserPermissionBackend("viewer", null, "delete")).toBe(false);
  });

  it("admin dan manager boleh keduanya", () => {
    expect(checkUserPermissionBackend("admin", null, "delete")).toBe(true);
    expect(checkUserPermissionBackend("manager", null, "update")).toBe(true);
  });

  it("custom yang tidak menyebut aksi itu tidak mengubah bawaan", () => {
    expect(checkUserPermissionBackend("user", { list: { create: false } } as any, "update")).toBe(
      true
    );
    expect(checkUserPermissionBackend("admin", { list: {} } as any, "delete")).toBe(true);
    expect(checkUserPermissionBackend("viewer", { board: { delete: true } } as any, "delete")).toBe(
      false
    );
  });

  it("peran ditulis dengan huruf besar pun dikenali", () => {
    expect(checkUserPermissionBackend("USER", { list: { delete: false } }, "delete")).toBe(false);
    expect(checkUserPermissionBackend("VIEWER", { list: { delete: true } }, "delete")).toBe(false);
    expect(checkUserPermissionBackend("ADMIN", null, "delete")).toBe(true);
  });
});
