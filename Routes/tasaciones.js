import { Router } from "express";
import { listarTasaciones } from "../Controllers/tasaciones.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

router.get("/", listarTasaciones);

export default router;
