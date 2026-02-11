import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  schema: "./src/db/schema.ts", // ¿Dónde están mis tablas?
  out: "./drizzle", // ¿Dónde guardo los archivos SQL generados?
  dialect: "postgresql", // ¿Qué base de datos uso?
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
