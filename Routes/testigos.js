import { Router } from "express";
import { listarTestigos } from "../Controllers/testigos.js";

const router = Router();

router.get("/", listarTestigos);

export default router;
