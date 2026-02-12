import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notifications.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Todas las rutas requieren autenticación
router.get("/", authenticateToken, getNotifications);
router.patch("/:notificationId/read", authenticateToken, markAsRead);
router.patch("/read-all", authenticateToken, markAllAsRead);

export default router;
