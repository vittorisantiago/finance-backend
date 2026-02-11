import express from "express";
import type { Request, Response } from "express";

import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- MIDDLEWARES ---

// 1. Helmet: Protege tu app de ataques conocidos en los headers HTTP.
app.use(helmet());

// 2. CORS: Permite que tu Frontend (que estará en otro puerto/dominio) se conecte aquí.
// Por ahora lo dejamos abierto ('*'), luego lo restringiremos a tu dominio real.
app.use(cors());

// 3. JSON Parser: Permite que tu app entienda datos en formato JSON (lo que envía el front).
app.use(express.json());

// --- RUTAS ---

// Health Check: Una ruta simple para ver si el servidor está vivo.
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "Finance API is running 🚀",
    timestamp: new Date().toISOString(),
  });
});

// Prueba de Base de Datos
app.get("/api/users-test", async (req: Request, res: Response) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error connecting to database" });
  }
});

// --- INICIAR SERVIDOR ---

app.listen(PORT, () => {
  console.log(`
  ################################################
  🛡️  Server listening on port: ${PORT} 🛡️
  ################################################
  `);
});
