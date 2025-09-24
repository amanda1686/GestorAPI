import { Router } from "express";
import {
  cambiarContrasena,
  crearEjerciente,
  listarEjercientes,
  obtenerEjerciente,
  actualizarEjerciente,
  eliminarEjerciente,
  actualizarEstado
} from "../Controllers/ejercientesController.js";

const router = Router();

router.put("/:id/contrasena", cambiarContrasena);
router.post("/", crearEjerciente);
router.get("/", listarEjercientes);
router.get("/:id", obtenerEjerciente);
router.put("/:id", actualizarEjerciente);
router.delete("/:id", eliminarEjerciente);
router.put("/:id/estado", actualizarEstado);

export default router;
