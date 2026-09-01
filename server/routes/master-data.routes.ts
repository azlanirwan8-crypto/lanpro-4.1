/**
 * Master Data Routes
 * CRUD operations for master data (dropdowns, enums, configurations)
 *
 * Menggunakan masterDataRepository untuk seluruh operasi data.
 */
import { Router } from "express";
import { verifyGlobalAdmin } from "../middleware/auth";
import crypto from "crypto";
import { masterDataRepository } from "../repositories/master-data.repository";
// Aturan penurunan kode dipakai bersama dengan penyemai (item #143).
// Impor statis, BUKAN require: proyek ini ESM, jadi `require` di berkas TS
// akan melempar "require is not defined" begitu server dijalankan.
import { kodeUnik } from "../lib/kode-master.cjs";
import { validasiBody } from "../middleware/validate";
import { createMasterDataSchema, updateMasterDataSchema } from "../schemas/master-data.schema";

const router = Router();

/**
 * Get all master data
 * GET /api/master-data
 */
router.get("/api/master-data", async (req, res) => {
  try {
    const rows = await masterDataRepository.findAll();
    res.json({ status: "success", data: rows });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: GET /api/master-data error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

/**
 * Create new master data item
 * POST /api/master-data
 * Body: { type, label, color?, icon?, order?, description?, fieldType?, dropdownOptions?, role_type? }
 */
router.post(
  "/api/master-data",
  verifyGlobalAdmin,
  validasiBody(createMasterDataSchema),
  async (req, res) => {
    try {
      const {
        id,
        type,
        label,
        code,
        color,
        icon,
        order,
        description,
        fieldType,
        dropdownOptions,
        role_type,
        roleType,
        isTerminal,
      } = req.body;
      const rType = role_type || roleType || null;

      const newId = id || crypto.randomUUID();
      const itemLabel = label || type || "Item";

      // Server-side validation for project_role
      if (type === "project_role") {
        const trimmedLabel = itemLabel.trim();
        if (trimmedLabel.length < 3) {
          return res.status(400).json({
            status: "error",
            code: "srv.nama_role_minimal_harus",
            message: "Nama Role minimal harus 3 karakter.",
          });
        }
        if (/^(.)\1+$/i.test(trimmedLabel)) {
          return res.status(400).json({
            status: "error",
            code: "srv.nama_role_tidak_boleh",
            message: "Nama Role tidak boleh berisi karakter sampah atau berulang.",
          });
        }
        const lowerLabel = trimmedLabel.toLowerCase();
        if (
          lowerLabel === "asdf" ||
          lowerLabel === "qwer" ||
          lowerLabel === "zxcv" ||
          lowerLabel === "junk" ||
          lowerLabel === "test" ||
          lowerLabel === "testing" ||
          lowerLabel === "dd"
        ) {
          return res.status(400).json({
            status: "error",
            code: "srv.nama_role_tidak_boleh_2",
            message: "Nama Role tidak boleh berupa karakter sampah atau acak.",
          });
        }
      }

      // Item #143 — INSERT dulu tidak pernah menyertakan `code`, jadi setiap
      // baris yang ditambahkan lewat panel lahir tanpa kode dan baru tertambal
      // kalau seseorang menjalankan `npm run db:seed-master`.
      const tipeFinal = type || "general";
      const kodeFinal =
        (typeof code === "string" && code.trim()) ||
        kodeUnik(itemLabel, await masterDataRepository.findCodesByType(tipeFinal)) ||
        null;

      const created = await masterDataRepository.create({
        id: newId,
        type: tipeFinal,
        label: itemLabel,
        code: kodeFinal,
        color: color || null,
        icon: icon || null,
        order: order || 0,
        description: description || null,
        fieldType: fieldType || null,
        dropdownOptions: dropdownOptions || null,
        role_type: rType,
        isTerminal:
          typeof isTerminal === "boolean"
            ? isTerminal
            : tipeFinal === "status" &&
              ["done", "selesai", "uat", "completed", "resolved", "closed"].includes(
                String(kodeFinal || itemLabel).toLowerCase()
              ),
      });

      res.json({ status: "success", data: created });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/master-data error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  }
);

/**
 * Update master data item
 * PUT /api/master-data/:id
 * Body: { label?, color?, icon?, order?, description?, fieldType?, dropdownOptions?, role_type?, type? }
 */
router.put(
  "/api/master-data/:id",
  verifyGlobalAdmin,
  validasiBody(updateMasterDataSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        label,
        color,
        icon,
        order,
        description,
        fieldType,
        dropdownOptions,
        role_type,
        roleType,
        type,
        isTerminal,
      } = req.body;
      const rType = role_type || roleType || null;

      const itemLabel = label !== undefined && label !== null ? label : "Item";

      // Server-side validation for project_role
      let itemType = type;
      if (!itemType) {
        const existing = await masterDataRepository.findById(id);
        if (existing) {
          itemType = existing.type;
        }
      }

      if (itemType === "project_role") {
        const trimmedLabel = itemLabel.trim();
        if (trimmedLabel.length < 3) {
          return res.status(400).json({
            status: "error",
            code: "srv.nama_role_minimal_harus",
            message: "Nama Role minimal harus 3 karakter.",
          });
        }
        if (/^(.)\1+$/i.test(trimmedLabel)) {
          return res.status(400).json({
            status: "error",
            code: "srv.nama_role_tidak_boleh",
            message: "Nama Role tidak boleh berisi karakter sampah atau berulang.",
          });
        }
        const lowerLabel = trimmedLabel.toLowerCase();
        if (
          lowerLabel === "asdf" ||
          lowerLabel === "qwer" ||
          lowerLabel === "zxcv" ||
          lowerLabel === "junk" ||
          lowerLabel === "test" ||
          lowerLabel === "testing" ||
          lowerLabel === "dd"
        ) {
          return res.status(400).json({
            status: "error",
            code: "srv.nama_role_tidak_boleh_2",
            message: "Nama Role tidak boleh berupa karakter sampah atau acak.",
          });
        }
      }

      await masterDataRepository.update(id, {
        label: itemLabel,
        color: color || null,
        icon: icon || null,
        order: order || 0,
        description: description || null,
        fieldType: fieldType || null,
        dropdownOptions: dropdownOptions || null,
        role_type: rType,
        ...(typeof isTerminal === "boolean" ? { isTerminal } : {}),
      });

      res.json({
        status: "success",
        code: "srv.masterdata_updated",
        message: "MasterData updated",
      });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/master-data error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  }
);

/**
 * Delete master data item (with safety checks)
 * DELETE /api/master-data/:id
 * Cannot delete system defaults or in-use items
 */
router.delete("/api/master-data/:id", verifyGlobalAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const item = await masterDataRepository.findById(id);
    if (!item) {
      return res.status(404).json({
        status: "error",
        code: "srv.master_data_tidak_ditemukan",
        message: "Master data tidak ditemukan.",
      });
    }

    if (item.is_system_default === 1 || item.is_system_default === true) {
      return res.status(400).json({
        status: "error",
        code: "srv.data_master_bawaan_sistem",
        message: "Data master bawaan sistem terkunci dan tidak dapat dihapus.",
      });
    }

    const usageCount = await masterDataRepository.countTaskUsage(item.label);
    if (usageCount > 0) {
      return res.status(400).json({
        status: "error",
        code: "srv.data_master_sedang_digunakan",
        params: { count: usageCount },
        message: `Data master ini sedang digunakan oleh ${usageCount} Task aktif dan tidak dapat dihapus.`,
      });
    }

    await masterDataRepository.delete(id);
    res.json({ status: "success", code: "srv.masterdata_deleted", message: "MasterData deleted" });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: DELETE /api/master-data error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

export default router;
