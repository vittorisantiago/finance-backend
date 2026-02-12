import { Router } from "express";
import {
  createTransaction,
  getCategories,
} from "../controllers/transactions.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Todas las rutas de este archivo requieren estar logueado
router.use(authenticateToken);

// GET /api/transactions/categories -> Obtener categorías (para el select del modal)
router.get("/categories", getCategories);

// POST /api/transactions -> Guardar un nuevo gasto o ingreso
router.post("/", createTransaction);

export default router;
