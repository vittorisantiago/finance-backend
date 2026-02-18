import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { budgets, transactions, categories } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";

export const getBudgets = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const userBudgets = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.isActive, true)));

    res.json(userBudgets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener presupuestos" });
  }
};

export const createBudget = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const {
      categoryId,
      limit,
      period = "monthly",
      alertPercentage = 80,
    } = req.body;

    if (!limit || limit <= 0) {
      return res.status(400).json({ error: "El límite debe ser mayor a 0" });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);

    const newBudget = await db
      .insert(budgets)
      .values({
        userId,
        categoryId: categoryId || null,
        limit: String(limit),
        period,
        month: period === "monthly" ? currentMonth : null,
        alertPercentage: String(alertPercentage),
      })
      .returning();

    res.status(201).json(newBudget[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear presupuesto" });
  }
};

export const updateBudget = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params as { id: string };
    const { limit, alertPercentage } = req.body;

    if (!id) {
      return res.status(400).json({ error: "ID de presupuesto requerido" });
    }

    // Verificar que el presupuesto pertenece al usuario
    const budget = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id as any), eq(budgets.userId, userId)));

    if (!budget || budget.length === 0) {
      return res.status(404).json({ error: "Presupuesto no encontrado" });
    }

    const updated = await db
      .update(budgets)
      .set({
        limit: limit ? String(limit) : budget[0]!.limit,
        alertPercentage: alertPercentage
          ? String(alertPercentage)
          : budget[0]!.alertPercentage,
        updatedAt: new Date(),
      })
      .where(eq(budgets.id, id as any))
      .returning();

    res.json(updated[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar presupuesto" });
  }
};

export const deleteBudget = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params as { id: string };

    if (!id) {
      return res.status(400).json({ error: "ID de presupuesto requerido" });
    }

    // Verificar que el presupuesto pertenece al usuario
    const budget = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id as any), eq(budgets.userId, userId)));

    if (!budget || budget.length === 0) {
      return res.status(404).json({ error: "Presupuesto no encontrado" });
    }

    await db
      .update(budgets)
      .set({ isActive: false })
      .where(eq(budgets.id, id as any));

    res.json({ message: "Presupuesto eliminado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar presupuesto" });
  }
};

export const getBudgetProgress = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const currentMonth = new Date().toISOString().slice(0, 7);

    const budgetProgress = await db
      .select({
        budgetId: budgets.id,
        categoryName: categories.name,
        limit: budgets.limit,
        spent: sql<number>`coalesce(sum(cast(${transactions.amount} as numeric)), 0)`,
        alertPercentage: budgets.alertPercentage,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .leftJoin(
        transactions,
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          eq(transactions.categoryId, budgets.categoryId),
          sql`to_char(${transactions.date}, 'YYYY-MM') = ${currentMonth}`,
        ),
      )
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.isActive, true),
          eq(budgets.month, currentMonth),
        ),
      )
      .groupBy(
        budgets.id,
        categories.name,
        budgets.limit,
        budgets.alertPercentage,
      );

    res.json(budgetProgress);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Error al obtener progreso de presupuestos" });
  }
};
