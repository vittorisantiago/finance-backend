import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { transactions, categories } from "../db/schema.js";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    // El userId viene del middleware authenticateToken
    const userId = (req as any).user?.userId;

    if (!userId) return res.status(401).json({ error: "No autorizado" });

    // Definir el rango de fechas (Este mes por defecto)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // 1. Obtener Transacciones Recientes
    const recentTransactions = await db.query.transactions.findMany({
      where: and(eq(transactions.userId, userId)),
      limit: 5,
      orderBy: [desc(transactions.date)],
      with: {
        category: true, // Traer info de la categoría
      },
    });

    // 2. Calcular Totales (Usando SQL puro para velocidad)
    // Esto suma todos los ingresos y egresos DEL MES
    const incomeResult = await db
      .select({ value: sql<number>`sum(${transactions.amount})` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "income"),
          gte(transactions.date, startOfMonth),
        ),
      );

    const expenseResult = await db
      .select({ value: sql<number>`sum(${transactions.amount})` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.date, startOfMonth),
        ),
      );

    const totalIncome = Number(incomeResult[0]?.value || 0);
    const totalExpense = Number(expenseResult[0]?.value || 0);
    const balance = totalIncome - totalExpense;

    res.json({
      balance,
      income: totalIncome,
      expenses: totalExpense,
      recentTransactions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener dashboard" });
  }
};
