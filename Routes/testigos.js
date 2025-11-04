import { Router } from "express";
import { listarTestigos, crearTestigo } from "../Controllers/testigos.js";

const router = Router();

router.get("/", listarTestigos);
router.post("/", crearTestigo);

export default router;
