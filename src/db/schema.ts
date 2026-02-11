import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";

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
