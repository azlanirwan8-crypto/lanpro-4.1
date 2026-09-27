import { Router } from "express";
import { sessionController } from "../controllers/session.controller";
import { authenticateJWT, verifyGlobalAdmin } from "../middleware/auth";
import { validasiQuery } from "../middleware/validate";
import { sessionListQuerySchema, userActivitiesQuerySchema } from "../schemas/session.schema";

const router = Router();

// Endpoint monitoring sesi pengguna (khusus Global Admin)
router.get(
  "/api/admin/sessions",
  authenticateJWT,
  verifyGlobalAdmin,
  validasiQuery(sessionListQuerySchema),
  (req, res) => sessionController.listSessions(req, res)
);

router.get(
  "/api/admin/users/:userId/activities",
  authenticateJWT,
  verifyGlobalAdmin,
  validasiQuery(userActivitiesQuerySchema),
  (req, res) => sessionController.getUserActivities(req, res)
);

router.post(
  "/api/admin/sessions/:sessionId/terminate",
  authenticateJWT,
  verifyGlobalAdmin,
  (req, res) => sessionController.terminateSession(req, res)
);

export default router;
