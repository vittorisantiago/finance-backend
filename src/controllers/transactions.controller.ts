import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { transactions, categories } from "../db/schema.js";
import { eq, or, and, desc, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

const parseDateParam = (value: string, mode: "start" | "end") => {
  // Acepta YYYY-MM-DD o ISO
  if (value.includes("T")) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  const parts = value.split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;

  if (mode === "start") return new Date(year, month - 1, day, 0, 0, 0, 0);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
};

// Schema validación
const transactionSchema = z.object({
  amount: z.number().positive(),
  categoryId: z.string().uuid(),
  date: z.string().datetime(), // Espera ISO string
  notes: z.string().optional(),
  type: z.enum(["income", "expense"]),
});

const updateTransactionSchema = transactionSchema;

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const validation = transactionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues });
    }

    const { amount, categoryId, date, notes, type } = validation.data;

    await db.insert(transactions).values({
      userId,
      categoryId,
      amount: amount.toString(), // Decimal se guarda como string en JS a veces o number
      date: new Date(date),
      notes,
      type,
    });

    res.status(201).json({ message: "Transacción guardada" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al guardar" });
  }
};

export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const transactionId = req.params.id as string;

    if (!transactionId) {
      return res.status(400).json({ error: "ID de transacción requerido" });
    }

    const validation = updateTransactionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues });
    }

    const { amount, categoryId, date, notes, type } = validation.data;

    const updated = await db
      .update(transactions)
      .set({
        amount: amount.toString(),
        categoryId,
        date: new Date(date),
        notes,
        type,
      })
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, userId),
        ),
      )
      .returning({ id: transactions.id });

    if (!updated.length) {
      return res.status(404).json({ error: "Transacción no encontrada" });
    }

    return res.json({ message: "Transacción actualizada" });
  } catch (error: any) {
    if (error?.code === "23503") {
      return res.status(409).json({
        error: "No se puede actualizar la transacción por relaciones activas",
      });
    }
    console.error(error);
    return res.status(500).json({ error: "Error al actualizar" });
  }
};

export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const transactionId = req.params.id as string;

    if (!transactionId) {
      return res.status(400).json({ error: "ID de transacción requerido" });
    }

    const deleted = await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, userId),
        ),
      )
      .returning({ id: transactions.id });

    if (!deleted.length) {
      return res.status(404).json({ error: "Transacción no encontrada" });
    }

    return res.json({ message: "Transacción eliminada" });
  } catch (error: any) {
    if (error?.code === "23503") {
      return res.status(409).json({
        error: "No se puede eliminar la transacción por relaciones activas",
      });
    }
    console.error(error);
    return res.status(500).json({ error: "Error al eliminar" });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    // Traer categorías por defecto (userId is null) O las propias del usuario
    const result = await db
      .select()
      .from(categories)
      .where(or(eq(categories.isDefault, true), eq(categories.userId, userId)));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener categorías" });
  }
};

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
  search: z.string().trim().max(100).optional().or(z.literal("")),
  type: z.enum(["income", "expense"]).optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const { page, pageSize, search, type, categoryId, startDate, endDate } =
      parsed.data;

    const conditionsBase: any[] = [eq(transactions.userId, userId)];

    if (categoryId)
      conditionsBase.push(eq(transactions.categoryId, categoryId));
    if (startDate) {
      const d = parseDateParam(startDate, "start");
      if (!d) return res.status(400).json({ error: "startDate inválida" });
      conditionsBase.push(gte(transactions.date, d));
    }
    if (endDate) {
      const d = parseDateParam(endDate, "end");
      if (!d) return res.status(400).json({ error: "endDate inválida" });
      conditionsBase.push(lte(transactions.date, d));
    }

    if (search && search.length > 0) {
      const like = `%${search}%`;
      conditionsBase.push(
        or(
          sql`coalesce(${transactions.notes}, '') ilike ${like}`,
          sql`coalesce(${categories.name}, '') ilike ${like}`,
        ),
      );
    }

    const conditionsForList = [...conditionsBase];
    if (type) conditionsForList.push(eq(transactions.type, type));

    const whereList = and(...conditionsForList);
    const offset = (page - 1) * pageSize;

    const items = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        notes: transactions.notes,
        date: transactions.date,
        amount: transactions.amount,
        currency: transactions.currency,
        category: {
          id: categories.id,
          name: categories.name,
          icon: categories.icon,
          color: categories.color,
          type: categories.type,
        },
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(whereList)
      .orderBy(desc(transactions.date))
      .limit(pageSize)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(whereList);

    const total = Number(totalResult[0]?.count || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const whereIncome = and(...conditionsBase, eq(transactions.type, "income"));
    const whereExpense = and(
      ...conditionsBase,
      eq(transactions.type, "expense"),
    );

    const [incomeSumRes, expenseSumRes] = await Promise.all([
      db
        .select({
          value: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(whereIncome),
      db
        .select({
          value: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(whereExpense),
    ]);

    const income = Number(incomeSumRes[0]?.value || 0);
    const expenses = Number(expenseSumRes[0]?.value || 0);

    res.json({
      items,
      page,
      pageSize,
      total,
      totalPages,
      summary: {
        income,
        expenses,
        balance: income - expenses,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener transacciones" });
  }
};

export const exportTransactions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const { search, type, categoryId, startDate, endDate } = parsed.data;

    const conditions: any[] = [eq(transactions.userId, userId)];
    if (categoryId) conditions.push(eq(transactions.categoryId, categoryId));
    if (startDate) {
      const d = parseDateParam(startDate, "start");
      if (!d) return res.status(400).json({ error: "startDate inválida" });
      conditions.push(gte(transactions.date, d));
    }
    if (endDate) {
      const d = parseDateParam(endDate, "end");
      if (!d) return res.status(400).json({ error: "endDate inválida" });
      conditions.push(lte(transactions.date, d));
    }
    if (search && search.length > 0) {
      const like = `%${search}%`;
      conditions.push(
        or(
          sql`coalesce(${transactions.notes}, '') ilike ${like}`,
          sql`coalesce(${categories.name}, '') ilike ${like}`,
        ),
      );
    }
    if (type) conditions.push(eq(transactions.type, type));

    const where = and(...conditions);

    const items = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        notes: transactions.notes,
        date: transactions.date,
        amount: transactions.amount,
        currency: transactions.currency,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(where)
      .orderBy(desc(transactions.date));

    res.json({ items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al exportar transacciones" });
  }
};
