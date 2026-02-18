import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { transactions, categories } from "../db/schema.js";
import { eq, and, gte, sql } from "drizzle-orm";

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    // Resumen general
    const summary = await db
      .select({
        totalIncome: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then cast(${transactions.amount} as numeric) else 0 end), 0)`,
        totalExpense: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then cast(${transactions.amount} as numeric) else 0 end), 0)`,
        totalTransactions: sql<number>`count(*)`,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId));

    // Tendencia mensual - últimos 6 meses
    const monthlyTrend = await db
      .select({
        month: sql<string>`to_char(${transactions.date}, 'Mon')`,
        income: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then cast(${transactions.amount} as numeric) else 0 end), 0)`,
        expenses: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then cast(${transactions.amount} as numeric) else 0 end), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, sixMonthsAgo),
        ),
      )
      .groupBy(
        sql`to_char(${transactions.date}, 'YYYY-MM'), to_char(${transactions.date}, 'Mon')`,
      )
      .orderBy(sql`to_char(${transactions.date}, 'YYYY-MM')`)
      .limit(6);

    // Ingresos vs Gastos por mes - últimos 6 meses
    const incomeVsExpenses = await db
      .select({
        month: sql<string>`to_char(${transactions.date}, 'Mon')`,
        income: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then cast(${transactions.amount} as numeric) else 0 end), 0)`,
        expenses: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then cast(${transactions.amount} as numeric) else 0 end), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, sixMonthsAgo),
        ),
      )
      .groupBy(
        sql`to_char(${transactions.date}, 'YYYY-MM'), to_char(${transactions.date}, 'Mon')`,
      )
      .orderBy(sql`to_char(${transactions.date}, 'YYYY-MM')`)
      .limit(6);

    // Top 8 categorías por gasto
    const topCategories = await db
      .select({
        name: categories.name,
        amount: sql<number>`coalesce(sum(cast(${transactions.amount} as numeric)), 0)`,
        percentage: sql<number>`round((coalesce(sum(cast(${transactions.amount} as numeric)), 0) / (select coalesce(sum(cast(amount as numeric)), 1) from ${transactions} where user_id = ${userId} and type = 'expense' and date >= ${thirtyDaysAgo})) * 100, 1)`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.date, thirtyDaysAgo),
        ),
      )
      .groupBy(categories.name)
      .orderBy(
        sql`coalesce(sum(cast(${transactions.amount} as numeric)), 0) DESC`,
      )
      .limit(8);

    res.json({
      summary: summary[0] || {
        totalIncome: 0,
        totalExpense: 0,
        totalTransactions: 0,
      },
      monthlyTrend,
      incomeVsExpenses,
      topCategories,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener analíticas" });
  }
};
