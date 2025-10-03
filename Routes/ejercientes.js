import { Router } from "express";
import {
  cambiarContrasena,
  crearEjerciente,
  listarEjercientes,
  obtenerEjerciente,
  actualizarEjerciente,
  eliminarEjerciente,
  actualizarEstado,
} from "../Controllers/ejercientesController.js";
import { authenticate, requireNivel } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

router.put("/:id/contrasena", requireNivel(1), cambiarContrasena);
router.post("/", requireNivel(1), crearEjerciente);
router.get("/", listarEjercientes);
router.get("/:id", obtenerEjerciente);
router.put("/:id", requireNivel(1, { allowSelfUpdate: true }), actualizarEjerciente);
router.delete("/:id", requireNivel(1), eliminarEjerciente);
router.put("/:id/estado", requireNivel(1), actualizarEstado);

export default router;
