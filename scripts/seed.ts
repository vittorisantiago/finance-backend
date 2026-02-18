import { db } from "../src/db/index.js";
import { categories } from "../src/db/schema.js";
import { and, eq, isNull } from "drizzle-orm";

type CategoryType = "income" | "expense";

type DefaultCategory = {
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
};

const defaultCategories: DefaultCategory[] = [
  { name: "Comida", icon: "Utensils", color: "#ef4444", type: "expense" },
  { name: "Transporte", icon: "Bus", color: "#f97316", type: "expense" },
  { name: "Vivienda", icon: "Home", color: "#3b82f6", type: "expense" },
  { name: "Servicios", icon: "Zap", color: "#eab308", type: "expense" },
  { name: "Salud", icon: "Stethoscope", color: "#ec4899", type: "expense" },
  {
    name: "Educación",
    icon: "GraduationCap",
    color: "#14b8a6",
    type: "expense",
  },
  {
    name: "Compras",
    icon: "ShoppingBag",
    color: "#f43f5e",
    type: "expense",
  },
  { name: "Ropa", icon: "ShoppingCart", color: "#fb7185", type: "expense" },
  {
    name: "Tecnología",
    icon: "Smartphone",
    color: "#a855f7",
    type: "expense",
  },
  {
    name: "Suscripciones",
    icon: "Laptop",
    color: "#0ea5e9",
    type: "expense",
  },
  {
    name: "Entretenimiento",
    icon: "Gamepad2",
    color: "#8b5cf6",
    type: "expense",
  },
  { name: "Viajes", icon: "Car", color: "#ef4444", type: "expense" },
  { name: "Impuestos", icon: "Briefcase", color: "#06b6d4", type: "expense" },
  {
    name: "Deudas / Préstamos",
    icon: "DollarSign",
    color: "#64748b",
    type: "expense",
  },
  {
    name: "Otros",
    icon: "CircleDollarSign",
    color: "#64748b",
    type: "expense",
  },

  { name: "Sueldo", icon: "Banknote", color: "#22c55e", type: "income" },
  { name: "Freelance", icon: "Laptop", color: "#0ea5e9", type: "income" },
  {
    name: "Negocio propio",
    icon: "Briefcase",
    color: "#06b6d4",
    type: "income",
  },
  {
    name: "Inversiones",
    icon: "TrendingUp",
    color: "#84cc16",
    type: "income",
  },
  {
    name: "Alquileres",
    icon: "Home",
    color: "#6366f1",
    type: "income",
  },
  {
    name: "Bonos / Comisiones",
    icon: "DollarSign",
    color: "#f59e0b",
    type: "income",
  },
  { name: "Aguinaldo", icon: "Gift", color: "#f97316", type: "income" },
  {
    name: "Horas extra",
    icon: "Briefcase",
    color: "#10b981",
    type: "income",
  },
  { name: "Ventas", icon: "ShoppingCart", color: "#f43f5e", type: "income" },
  {
    name: "Reembolsos",
    icon: "CircleDollarSign",
    color: "#22c55e",
    type: "income",
  },
  {
    name: "Regalos recibidos",
    icon: "Gift",
    color: "#a855f7",
    type: "income",
  },
  {
    name: "Jubilación / Pensión",
    icon: "Heart",
    color: "#14b8a6",
    type: "income",
  },
  {
    name: "Becas / Subsidios",
    icon: "Book",
    color: "#0ea5e9",
    type: "income",
  },
  {
    name: "Venta de activos",
    icon: "Wallet",
    color: "#64748b",
    type: "income",
  },
  { name: "Otros", icon: "CircleDollarSign", color: "#64748b", type: "income" },
];

async function main() {
  console.log("🌱 Sembrando categorías...");

  let inserted = 0;
  let skipped = 0;

  for (const cat of defaultCategories) {
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.name, cat.name),
          eq(categories.type, cat.type),
          eq(categories.isDefault, true),
          isNull(categories.userId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    await db.insert(categories).values({
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: cat.type,
      isDefault: true,
      userId: null,
    });
    inserted++;
  }

  console.log(
    `✅ Seed completado. Insertadas: ${inserted}. Ya existentes: ${skipped}.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
