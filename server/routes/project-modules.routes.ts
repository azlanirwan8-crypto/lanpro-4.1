/**
 * Rute CRUD Project Modules — master data modul/aplikasi per proyek.
 *
 * Menggunakan projectModuleRepository untuk akses data dan transaksi atomik.
 */
import { Router } from "express";
import { jagaSetelanProyek } from "../middleware/jagaProyek";
import { projectModuleRepository } from "../repositories/project-module.repository";
import { validasiBody } from "../middleware/validate";
import {
  createProjectModuleSchema,
  updateProjectModuleSchema,
} from "../schemas/project-module.schema";

const router = Router();

// ProjectModules API (Master Data for Modul/Aplikasi)
router.get("/api/project-modules", async (req, res) => {
  try {
    const rows = await projectModuleRepository.findAll();
    res.json({ status: "success", data: rows });
  } catch (error: any) {
    console.error("GET /api/project-modules error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

router.post(
  "/api/project-modules",
  jagaSetelanProyek(),
  validasiBody(createProjectModuleSchema),
  async (req, res) => {
    try {
      const { id, projectId, namaModul, keterangan } = req.body;

      await projectModuleRepository.create({
        id: id || String(Date.now()),
        projectId,
        namaModul,
        keterangan,
      });

      res.json({ status: "success", code: "srv.module_created", message: "Module created" });
    } catch (error: any) {
      console.error("POST /api/project-modules error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  }
);

router.put(
  "/api/project-modules/:id",
  jagaSetelanProyek("projectModule"),
  validasiBody(updateProjectModuleSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { projectId, namaModul, keterangan } = req.body;

      await projectModuleRepository.update(id, {
        projectId,
        namaModul,
        keterangan,
      });

      res.json({ status: "success", code: "srv.module_updated", message: "Module updated" });
    } catch (error: any) {
      console.error("PUT /api/project-modules/:id error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
    }
  }
);

router.delete("/api/project-modules/:id", jagaSetelanProyek("projectModule"), async (req, res) => {
  try {
    const { id } = req.params;
    await projectModuleRepository.deleteWithTestCases(id);
    res.json({
      status: "success",
      code: "srv.module_and_linked_test",
      message: "Module and linked test cases deleted",
    });
  } catch (error: any) {
    console.error("DELETE /api/project-modules/:id error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

export default router;
