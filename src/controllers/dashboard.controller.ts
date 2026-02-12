import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { transactions, categories } from "../db/schema.js";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    // El userId viene del middleware authenticateToken
    const userId = (req as any).user?.userId;
    const days = parseInt(req.query.days as string) || 30; // Parámetro opcional, default 30 días

    if (!userId) return res.status(401).json({ error: "No autorizado" });

    // Definir el rango de fechas (Este mes por defecto)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // 1. Obtener Transacciones Recientes
    const recentTransactions = await db.query.transactions.findMany({
      where: and(eq(transactions.userId, userId)),
      limit: 8,
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

    // 3. Datos para el gráfico de flujo de caja (Variable según filtro)
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Obtener datos agrupados por día y tipo
    const chartDataRaw = await db
      .select({
        date: sql<string>`DATE(${transactions.date})`,
        type: transactions.type,
        total: sql<number>`SUM(${transactions.amount})`,
      })
      .from(transactions)
      .where(
        and(eq(transactions.userId, userId), gte(transactions.date, daysAgo)),
      )
      .groupBy(sql`DATE(${transactions.date})`, transactions.type)
      .orderBy(sql`DATE(${transactions.date})`);

    // Rellenar días vacíos para mostrar gráfico continuo
    const chartData = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0]; // "2026-02-11"

      // Buscar ingresos y gastos de ese día
      const incomeEntry = chartDataRaw.find(
        (r) => r.date === dateStr && r.type === "income",
      );
      const expenseEntry = chartDataRaw.find(
        (r) => r.date === dateStr && r.type === "expense",
      );

      chartData.push({
        date: dateStr,
        day: d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" }),
        income: Number(incomeEntry?.total || 0),
        expense: Number(expenseEntry?.total || 0),
      });
    }

    res.json({
      balance,
      income: totalIncome,
      expenses: totalExpense,
      recentTransactions,
      chartData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener dashboard" });
  }
};
