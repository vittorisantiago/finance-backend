import { db } from "../src/db/index.js";
import { notifications, users } from "../src/db/schema.js";

async function main() {
  console.log("🔔 Creando notificaciones de ejemplo...");

  // Obtener el primer usuario
  const allUsers = await db.select().from(users).limit(1);

  if (allUsers.length === 0) {
    console.error("❌ No hay usuarios en la base de datos. Crea uno primero.");
    process.exit(1);
  }

  const user = allUsers[0]!;

  const sampleNotifications = [
    {
      userId: user.id,
      title: "¡Bienvenido a FinanceStart! 🎉",
      message:
        "Gracias por unirte. Comienza a registrar tus transacciones para ver tu flujo de caja.",
      type: "success",
      isRead: false,
    },
    {
      userId: user.id,
      title: "Nuevo gasto registrado",
      message: "Se registró un gasto de $1,500 en la categoría Transporte.",
      type: "info",
      isRead: false,
    },
    {
      userId: user.id,
      title: "Meta mensual alcanzada 🎯",
      message:
        "¡Felicitaciones! Lograste mantener tus gastos bajo control este mes.",
      type: "success",
      isRead: true,
    },
    {
      userId: user.id,
      title: "Recordatorio: Revisar gastos",
      message:
        "No olvides revisar tus gastos semanales para mantener tu presupuesto.",
      type: "warning",
      isRead: false,
    },
  ];

  for (const notification of sampleNotifications) {
    await db.insert(notifications).values(notification);
  }

  console.log("✅ Notificaciones de ejemplo creadas correctamente.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
