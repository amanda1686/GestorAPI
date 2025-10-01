import { Router } from "express";
import { listarTestigos } from "../Controllers/testigos.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

router.get("/", listarTestigos);

export default router;
