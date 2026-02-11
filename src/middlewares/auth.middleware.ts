import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Leer cookie o header Authorization
  const token =
    req.cookies.auth_token || req.headers["authorization"]?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Acceso denegado" });

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    (req as any).user = user; // Inyectamos el usuario en la request
    next();
  });
};
