import { Router } from "express";
import { sessionController } from "../controllers/session.controller";
import { authenticateJWT, verifyGlobalAdmin } from "../middleware/auth";

const router = Router();

// Endpoint monitoring sesi pengguna (khusus Global Admin)
router.get("/api/admin/sessions", authenticateJWT, verifyGlobalAdmin, (req, res) =>
  sessionController.listSessions(req, res)
);

router.get("/api/admin/users/:userId/activities", authenticateJWT, verifyGlobalAdmin, (req, res) =>
  sessionController.getUserActivities(req, res)
);

router.post(
  "/api/admin/sessions/:sessionId/terminate",
  authenticateJWT,
  verifyGlobalAdmin,
  (req, res) => sessionController.terminateSession(req, res)
);

export default router;
