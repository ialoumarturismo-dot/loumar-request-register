import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDeadlineSoonNotification } from "@/app/actions/notifications";

/**
 * Cron endpoint para verificar deadlines próximas e enviar notificações
 * Protegido por CRON_SECRET
 *
 * Deve ser chamado periodicamente (ex.: a cada hora via Vercel Cron ou similar)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET não configurado" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const now = new Date();

    // Buscar demandas com deadline nas próximas 24h e 6h
    const deadlines = [
      { hours: 24, label: "24h" },
      { hours: 6, label: "6h" },
    ];

    const notificationsSent: string[] = [];

    for (const { hours, label } of deadlines) {
      const targetTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
      const windowStart = new Date(targetTime.getTime() - 30 * 60 * 1000); // 30min antes
      const windowEnd = new Date(targetTime.getTime() + 30 * 60 * 1000); // 30min depois

      // Buscar demandas com due_at no intervalo e status não concluído
      const { data: demands, error } = await admin
        .from("demands")
        .select("id, name, due_at, assigned_to_user_id, status")
        .not("due_at", "is", null)
        .gte("due_at", windowStart.toISOString())
        .lte("due_at", windowEnd.toISOString())
        .neq("status", "Concluído")
        .not("assigned_to_user_id", "is", null);

      if (error) {
        console.error(`[cron/deadlines] Error fetching ${label} deadlines:`, error);
        continue;
      }

      // Enviar notificações
      for (const demand of demands || []) {
        if (!demand.assigned_to_user_id) continue;

        try {
          await sendDeadlineSoonNotification(
            demand.id,
            demand.assigned_to_user_id,
            hours
          );
          notificationsSent.push(`${demand.id} (${label})`);
        } catch (err) {
          console.error(
            `[cron/deadlines] Error sending notification for ${demand.id}:`,
            err
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      notificationsSent: notificationsSent.length,
      details: notificationsSent,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error("[cron/deadlines] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

