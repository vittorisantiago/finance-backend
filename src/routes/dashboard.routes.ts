import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { getDashboardSummary } from "../controllers/dashboard.controller.js";

const router = Router();

router.get("/summary", authenticateToken, getDashboardSummary);

export default router;
