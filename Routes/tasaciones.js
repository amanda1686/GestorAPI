import { Router } from "express";
import { listarTasaciones } from "../Controllers/tasaciones.js";

const router = Router();

router.get("/", listarTasaciones);

export default router;
