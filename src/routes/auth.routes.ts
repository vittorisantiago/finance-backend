import { Router } from "express";
import {
  register,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  getMe,
  updateMe,
  cancelSubscription,
} from "../controllers/auth.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

// POST
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);

// GET
router.get("/me", authenticateToken, getMe);

// PATCH
router.patch("/me", authenticateToken, updateMe);

// POST
router.post("/cancel-subscription", authenticateToken, cancelSubscription);

export default router;
