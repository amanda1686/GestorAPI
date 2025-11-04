import { Router } from "express";
import { listarTasaciones, crearTasacion } from "../Controllers/tasaciones.js";

const router = Router();

router.get("/", listarTasaciones);
router.post("/", crearTasacion);

export default router;
