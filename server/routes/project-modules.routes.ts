/**
 * Rute CRUD Project Modules — master data modul/aplikasi per proyek.
 *
 * Menggunakan projectModuleRepository untuk akses data dan transaksi atomik.
 */
import { Router } from "express";
import { jagaSetelanProyek } from "../middleware/jagaProyek";
import { projectModuleRepository } from "../repositories/project-module.repository";

const router = Router();

// ProjectModules API (Master Data for Modul/Aplikasi)
router.get("/api/project-modules", async (req, res) => {
  try {
    const rows = await projectModuleRepository.findAll();
    res.json({ status: "success", data: rows });
  } catch (error: any) {
    console.error("GET /api/project-modules error:", error);
    res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
  }
});

router.post(
  "/api/project-modules",
  jagaSetelanProyek(),
  async (req, res) => {
    try {
      const { id, projectId, namaModul, keterangan } = req.body;
      if (!projectId || !namaModul) {
        return res
          .status(400)
          .json({ status: "error", message: "projectId and namaModul are required" });
      }

      await projectModuleRepository.create({
        id: id || String(Date.now()),
        projectId,
        namaModul,
        keterangan,
      });

      res.json({ status: "success", message: "Module created" });
    } catch (error: any) {
      console.error("POST /api/project-modules error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
    }
  }
);

router.put(
  "/api/project-modules/:id",
  jagaSetelanProyek("projectModule"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { projectId, namaModul, keterangan } = req.body;

      await projectModuleRepository.update(id, {
        projectId,
        namaModul,
        keterangan,
      });

      res.json({ status: "success", message: "Module updated" });
    } catch (error: any) {
      console.error("PUT /api/project-modules/:id error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
    }
  }
);

router.delete("/api/project-modules/:id", jagaSetelanProyek("projectModule"), async (req, res) => {
  try {
    const { id } = req.params;
    await projectModuleRepository.deleteWithTestCases(id);
    res.json({ status: "success", message: "Module and linked test cases deleted" });
  } catch (error: any) {
    console.error("DELETE /api/project-modules/:id error:", error);
    res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server" });
  }
});

export default router;
