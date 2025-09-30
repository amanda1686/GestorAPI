import { Router } from "express";
import { listarTestigos } from "../Controllers/testigos";

const router = Router();

router.get("/", listarTestigos);

export default router;
