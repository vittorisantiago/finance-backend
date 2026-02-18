import { Router } from "express";
import {
  createTransaction,
  deleteTransaction,
  exportTransactions,
  getCategories,
  getTransactions,
  updateTransaction,
} from "../controllers/transactions.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Todas las rutas de este archivo requieren estar logueado
router.use(authenticateToken);

// GET /api/transactions/categories -> Obtener categorías (para el select del modal)
router.get("/categories", getCategories);

// GET /api/transactions/export -> Exportación (historial completo con filtros)
router.get("/export", exportTransactions);

// GET /api/transactions -> Listado con paginación + filtros
router.get("/", getTransactions);

// POST /api/transactions -> Guardar un nuevo gasto o ingreso
router.post("/", createTransaction);

// PUT /api/transactions/:id -> Actualizar una transacción
router.put("/:id", updateTransaction);

// DELETE /api/transactions/:id -> Eliminar una transacción
router.delete("/:id", deleteTransaction);

export default router;
