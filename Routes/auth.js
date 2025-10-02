import { Router } from "express";
import { login, getProfile, updateProfile } from "../Controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/login", login);
router.get("/me", authenticate, getProfile);
router.put("/me", authenticate, updateProfile);

export default router;
