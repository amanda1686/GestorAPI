import { Router } from "express";
import {
  deleteCommunication,
  getCommunicationDetail,
  listInbox,
  listSentCommunications,
  markCommunicationRead,
  sendCommunication,
  toggleCommunicationArchive,
} from "../Controllers/communicationsController.js";
import { authenticate, requireNivel } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

router.post("/", requireNivel(1), sendCommunication);
router.get("/sent", requireNivel(1), listSentCommunications);
router.get("/inbox", listInbox);
router.get("/:id", getCommunicationDetail);
router.patch("/:id/read", markCommunicationRead);
router.patch("/:id/archive", toggleCommunicationArchive);
router.delete("/:id", deleteCommunication);

export default router;
