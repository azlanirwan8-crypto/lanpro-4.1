/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../useAuth";
import i18n from "../../i18n";

jest.mock("../../lib/db", () => ({
  db: {
    query: jest.fn(),
  },
}));

describe("useAuth handleLogoutRequest i18n (item #176)", () => {
  it("mengirim teks konfirmasi logout berbahasa Indonesia ketika bahasa aktif 'id'", async () => {
    await i18n.changeLanguage("id");
    const mockSetConfirmAction = jest.fn();

    const { result } = renderHook(() =>
      useAuth(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        mockSetConfirmAction
      )
    );

    act(() => {
      result.current.handleLogoutRequest();
    });

    expect(mockSetConfirmAction).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        title: "Logout Akun",
        message: "Apakah Anda yakin ingin keluar? Sesi Anda akan diakhiri.",
        variant: "warning",
        confirmText: "Ya, Keluar",
        cancelText: "Batal",
      })
    );
  });

  it("mengirim teks konfirmasi logout berbahasa Inggris ketika bahasa aktif 'en'", async () => {
    await i18n.changeLanguage("en");
    const mockSetConfirmAction = jest.fn();

    const { result } = renderHook(() =>
      useAuth(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        mockSetConfirmAction
      )
    );

    act(() => {
      result.current.handleLogoutRequest();
    });

    expect(mockSetConfirmAction).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        title: "Log Out Account",
        message: "Are you sure you want to log out? Your session will be ended.",
        variant: "warning",
        confirmText: "Yes, Log Out",
        cancelText: "Cancel",
      })
    );
  });
});
