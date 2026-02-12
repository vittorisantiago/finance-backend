import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { transactions, categories } from '../db/schema.js';
import { eq, or, and } from 'drizzle-orm';
import { z } from 'zod';

// Schema validación
const transactionSchema = z.object({
  amount: z.number().positive(),
  categoryId: z.string().uuid(),
  date: z.string().datetime(), // Espera ISO string
  notes: z.string().optional(),
  type: z.enum(['income', 'expense']),
});

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

    res.status(201).json({ message: 'Transacción guardada' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al guardar' });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    // Traer categorías por defecto (userId is null) O las propias del usuario
    const result = await db.select().from(categories)
      .where(or(
        eq(categories.isDefault, true),
        eq(categories.userId, userId)
      ));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
};