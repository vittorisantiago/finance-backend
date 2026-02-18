import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  decimal,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Definimos la tabla 'users'
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(), // ID único autogenerado
  email: text("email").notNull().unique(), // Email obligatorio y único
  passwordHash: text("password_hash").notNull(), // Guardamos el HASH, nunca la pass real
  fullName: text("full_name"), // Nombre opcional al principio

  // Para gestionar suscripciones
  plan: text("plan").default("free").notNull(), // 'free', 'basic', 'premium'
  role: text("role").default("user").notNull(), // 'user' o 'admin' (para vos)

  // Auditoría (Saber cuándo se creó o editó)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabla para tokens de recuperación de contraseña
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
});

// TABLA DE CATEGORÍAS (Ej: Comida, Transporte)
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(), // Guardaremos el nombre del ícono (ej: "Pizza")
  color: text("color").notNull(), // Ej: "#F97316" (Naranja)
  isDefault: boolean("is_default").default(false), // Si es una categoría del sistema
  userId: uuid("user_id").references(() => users.id), // Si es null, es global. Si tiene ID, es personalizada del usuario.
  type: text("type").notNull().default("expense"), // 'income' o 'expense'
});

// TABLA DE TRANSACCIONES (Gastos e Ingresos)
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // Soporta montos grandes
  currency: text("currency").default("ARS").notNull(), // ARS o USD
  date: timestamp("date").defaultNow().notNull(),
  notes: text("notes"),
  type: text("type").notNull(), // 'income' o 'expense'
  createdAt: timestamp("created_at").defaultNow(),
});

// TABLA DE NOTIFICACIONES
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // 'info', 'success', 'warning', 'error'
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// TABLA DE PRESUPUESTOS (BUDGETS)
export const budgets = pgTable("budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  limit: decimal("limit", { precision: 12, scale: 2 }).notNull(),
  spent: decimal("spent", { precision: 12, scale: 2 }).default("0"),
  period: text("period").notNull().default("monthly"), // 'weekly', 'monthly', 'yearly'
  month: text("month"), // 'YYYY-MM' para presupuestos mensuales
  alertPercentage: decimal("alert_percentage", {
    precision: 5,
    scale: 2,
  }).default("80"), // Porcentaje para alerta
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// RELACIONES (Para que Drizzle sepa navegar entre tablas)
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  categories: many(categories),
  notifications: many(notifications),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
