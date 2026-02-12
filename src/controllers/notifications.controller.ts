import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

// Obtener notificaciones del usuario
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(10);

    // Contar las no leídas
    const unreadCount = userNotifications.filter((n) => !n.isRead).length;

    res.json({
      notifications: userNotifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// Marcar notificación como leída
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { notificationId } = req.params;

    if (!notificationId || Array.isArray(notificationId)) {
      return res.status(400).json({ message: "ID de notificación requerido" });
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId as string),
          eq(notifications.userId, userId),
        ),
      );

    res.json({ message: "Notificación marcada como leída" });
  } catch (error) {
    console.error("Error al marcar notificación:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// Marcar todas como leídas
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));

    res.json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (error) {
    console.error("Error al marcar todas como leídas:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};
