import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { users, passwordResetTokens } from "../db/schema.js";
import { eq } from "drizzle-orm"; // 'eq' significa 'equal' (igual a)
import bcrypt from "bcryptjs";
import { z } from "zod"; // Para validación estricta
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import crypto from "crypto"; // Librería nativa de Node para generar tokens random

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// 1. Definimos el esquema de validación con Zod
// Esto protege tu API de datos basura o maliciosos
const registerSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z
    .string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  fullName: z.string().optional(),
});

export const register = async (req: Request, res: Response) => {
  try {
    // 2. Validar los datos que llegan del Frontend
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Datos inválidos",
        details: validation.error.issues,
      });
    }

    const { email, password, fullName } = validation.data;

    // 3. Verificar si el usuario ya existe
    // Buscamos en la tabla 'users' donde el email sea igual al recibido
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUser.length > 0) {
      return res.status(409).json({ error: "El usuario ya existe" });
    }

    // 4. Hashear la contraseña (¡Nunca guardar texto plano!)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 5. Guardar en Base de Datos
    // 'returning()' nos devuelve los datos del usuario recién creado
    const newUser = await db
      .insert(users)
      .values({
        email,
        passwordHash, // Guardamos el hash, NO la password
        fullName,
        plan: "free",
        role: "user",
      })
      .returning({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
      });

    // 6. Responder con éxito
    res.status(201).json({
      message: "Usuario registrado con éxito 🚀",
      user: newUser[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Schema para validar los datos de entrada del login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const login = async (req: Request, res: Response) => {
  try {
    // 1. Validar datos
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Datos inválidos" });
    }
    const { email, password } = validation.data;

    // 2. Buscar usuario
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    const user = userResult[0];

    if (!user || !user.passwordHash) {
      // Por seguridad, damos el mismo error si no existe o si la pass está mal
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // 3. Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // 4. Generar Token JWT (La "pulsera")
    // Guardamos el ID, el Email y el Rol dentro del token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, plan: user.plan },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }, // La sesión dura 7 días
    );

    // 5. Enviar Cookie HTTP-Only
    // Esta cookie NO puede ser leída por JavaScript del frontend (seguridad total)
    res.cookie("auth_token", token, {
      httpOnly: true, // Clave para seguridad XSS
      secure: process.env.NODE_ENV === "production", // Solo HTTPS en producción
      sameSite: "lax", // Protege contra CSRF básico
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en milisegundos
    });

    // 6. Responder al Frontend (sin mandar el token en el cuerpo, va en la cookie)
    res.json({
      message: "Login exitoso",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

// Función para Logout (Simple: borrar la cookie)
export const logout = (req: Request, res: Response) => {
  res.clearCookie("auth_token");
  res.json({ message: "Sesión cerrada" });
};

// 1. SOLICITAR CAMBIO DE CONTRASEÑA
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Verificar si el usuario existe
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    if (userResult.length === 0) {
      // Por seguridad, no decimos "no existe", decimos "si existe, enviamos el mail"
      // para evitar que hackers comprueben qué emails están registrados.
      return res.json({
        message: "Si el email existe, recibirás instrucciones.",
      });
    }

    // Generar token seguro
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora de validez

    // Guardar token en DB
    await db.insert(passwordResetTokens).values({
      email,
      token,
      expiresAt,
    });

    // Enviar Email
    // NOTA: Cambiá 'onboarding@resend.dev' por el que te de Resend o tu dominio verificado.
    // Cambiá 'http://localhost:3000' por tu dominio real en producción.
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Recuperar Contraseña - FinanceStart",
      html: `
        <h1>Recuperación de Contraseña</h1>
        <p>Hacé clic en el siguiente enlace para restablecer tu contraseña:</p>
        <a href="http://localhost:3000/reset-password?token=${token}">Restablecer Contraseña</a>
        <p>Este enlace expira en 1 hora.</p>
      `,
    });

    res.json({ message: "Si el email existe, recibirás instrucciones." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al procesar la solicitud" });
  }
};

// 2. CAMBIAR LA CONTRASEÑA REALMENTE
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    // USAMOS DESTRUCTURING AQUÍ:
    // Esto intenta sacar el primer elemento del array directamente.
    const [resetData] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));

    // Verificamos si resetData existe directamente
    if (!resetData) {
      return res.status(400).json({ error: "Token inválido o expirado" });
    }

    // Ahora TypeScript ya sabe que resetData NO es undefined
    if (new Date() > resetData.expiresAt) {
      return res.status(400).json({ error: "El token ha expirado" });
    }

    // ... (resto de la función: hashear password, actualizar usuario, borrar token)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.email, resetData.email));

    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));

    res.json({ message: "Contraseña actualizada con éxito" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cambiar contraseña" });
  }
};
