import { db } from "../src/db/index.js";
import { categories } from "../src/db/schema.js";
import { v4 as uuidv4 } from "uuid";

const defaultCategories = [
  // Gastos
  {
    name: "Comida",
    icon: "Utensils",
    color: "#ef4444",
    type: "expense",
    isDefault: true,
  },
  {
    name: "Transporte",
    icon: "Bus",
    color: "#f97316",
    type: "expense",
    isDefault: true,
  },
  {
    name: "Vivienda",
    icon: "Home",
    color: "#3b82f6",
    type: "expense",
    isDefault: true,
  },
  {
    name: "Servicios",
    icon: "Zap",
    color: "#eab308",
    type: "expense",
    isDefault: true,
  },
  {
    name: "Entretenimiento",
    icon: "Gamepad2",
    color: "#8b5cf6",
    type: "expense",
    isDefault: true,
  },
  {
    name: "Salud",
    icon: "Stethoscope",
    color: "#ec4899",
    type: "expense",
    isDefault: true,
  },
  {
    name: "Educación",
    icon: "GraduationCap",
    color: "#14b8a6",
    type: "expense",
    isDefault: true,
  },
  {
    name: "Compras",
    icon: "ShoppingBag",
    color: "#f43f5e",
    type: "expense",
    isDefault: true,
  },
  // Ingresos
  {
    name: "Sueldo",
    icon: "Banknote",
    color: "#22c55e",
    type: "income",
    isDefault: true,
  },
  {
    name: "Freelance",
    icon: "Laptop",
    color: "#0ea5e9",
    type: "income",
    isDefault: true,
  },
  {
    name: "Inversiones",
    icon: "TrendingUp",
    color: "#84cc16",
    type: "income",
    isDefault: true,
  },
  {
    name: "Otros",
    icon: "CircleDollarSign",
    color: "#64748b",
    type: "income",
    isDefault: true,
  },
];

async function main() {
  console.log("🌱 Sembrando categorías...");

  for (const cat of defaultCategories) {
    await db.insert(categories).values({
      // @ts-ignore
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: cat.type,
      isDefault: true,
      userId: null, // null porque son globales
    });
  }

  console.log("✅ Categorías insertadas correctamente.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
