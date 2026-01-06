"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplateMessage, generateDedupeKey } from "@/lib/whatsapp/flwchat";

const WTS_TEMPLATE_DEMAND_CREATED =
  process.env.WTS_TEMPLATE_DEMAND_CREATED || "";
const WTS_TEMPLATE_DEMAND_ASSIGNED =
  process.env.WTS_TEMPLATE_DEMAND_ASSIGNED || "";
const WTS_TEMPLATE_MANAGER_COMMENT =
  process.env.WTS_TEMPLATE_MANAGER_COMMENT || "";
const WTS_TEMPLATE_DEADLINE_SOON = process.env.WTS_TEMPLATE_DEADLINE_SOON || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Helper: Save notification record
 */
async function saveNotification(
  userId: string,
  demandId: string | null,
  templateId: string,
  payload: Record<string, any>,
  dedupeKey: string
): Promise<string> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("notifications")
    .insert({
      user_id: userId,
      demand_id: demandId,
      channel: "whatsapp",
      template_id: templateId,
      payload,
      status: "queued",
      dedupe_key: dedupeKey,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[notifications] Save error:", error);
    throw new Error(`Erro ao salvar notificação: ${error.message}`);
  }

  return data.id;
}

/**
 * Helper: Update notification status
 */
async function updateNotificationStatus(
  notificationId: string,
  status: "sent" | "failed",
  providerMessageId?: string,
  errorMessage?: string
): Promise<void> {
  const admin = createAdminClient();

  await admin
    .from("notifications")
    .update({
      status,
      provider_message_id: providerMessageId || null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      error_message: errorMessage || null,
    })
    .eq("id", notificationId);
}

/**
 * Send demand created notification
 */
export async function sendDemandCreatedNotification(
  demandId: string,
  userId: string
): Promise<void> {
  try {
    console.log("[notifications] sendDemandCreatedNotification chamada - demandId:", demandId, "userId:", userId);
    const admin = createAdminClient();

    // Get user profile
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("whatsapp_phone, whatsapp_opt_in")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("[notifications] Erro ao buscar perfil:", profileError);
      return;
    }

    console.log("[notifications] Perfil encontrado:", {
      userId,
      hasPhone: !!profile?.whatsapp_phone,
      phone: profile?.whatsapp_phone,
      optIn: profile?.whatsapp_opt_in,
    });

    if (!profile || !profile.whatsapp_opt_in || !profile.whatsapp_phone) {
      console.log("[notifications] Notificação não enviada - perfil inválido ou opt-out:", {
        hasProfile: !!profile,
        optIn: profile?.whatsapp_opt_in,
        hasPhone: !!profile?.whatsapp_phone,
      });
      return; // User opted out or no phone
    }

    // Get demand details
    const { data: demand, error: demandError } = await admin
      .from("demands")
      .select("name, destination_department")
      .eq("id", demandId)
      .single();

    if (demandError) {
      console.error("[notifications] Erro ao buscar demanda:", demandError);
      return;
    }

    if (!demand) {
      console.log("[notifications] Demanda não encontrada:", demandId);
      return;
    }

    console.log("[notifications] Enviando mensagem WhatsApp:", {
      templateId: WTS_TEMPLATE_DEMAND_CREATED,
      phone: profile.whatsapp_phone,
      demandName: demand.name,
    });

    const dedupeKey = generateDedupeKey("demand_created", demandId, userId);
    const notificationId = await saveNotification(
      userId,
      demandId,
      WTS_TEMPLATE_DEMAND_CREATED,
      {
        demand_name: demand.name,
        department: demand.destination_department || "",
      },
      dedupeKey
    );

    const linkUrl = `${APP_URL}/admin?demandId=${demandId}`;
    const result = await sendTemplateMessage({
      phone: profile.whatsapp_phone,
      templateId: WTS_TEMPLATE_DEMAND_CREATED,
      variables: {
        demand_name: demand.name,
        department: demand.destination_department || "",
      },
      linkUrl,
    });

    console.log("[notifications] Resultado do envio:", result);

    if (result.ok) {
      await updateNotificationStatus(notificationId, "sent", result.messageId);
      console.log("[notifications] Notificação enviada com sucesso");
    } else {
      await updateNotificationStatus(
        notificationId,
        "failed",
        undefined,
        result.error
      );
      console.error("[notifications] Erro ao enviar notificação:", result.error);
    }
  } catch (err) {
    console.error("[notifications] Demand created error:", err);
  }
}

/**
 * Send demand assigned notification
 */
export async function sendDemandAssignedNotification(
  demandId: string,
  userId: string,
  assignedByUserId?: string
): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("whatsapp_phone, whatsapp_opt_in")
      .eq("id", userId)
      .single();

    if (!profile || !profile.whatsapp_opt_in || !profile.whatsapp_phone) {
      return;
    }

    const { data: demand } = await admin
      .from("demands")
      .select("name, destination_department")
      .eq("id", demandId)
      .single();

    if (!demand) {
      return;
    }

    // Buscar nome do gestor que atribuiu (se fornecido)
    let assignerName = "Gestor";
    if (assignedByUserId) {
      const { data: assignerProfile } = await admin
        .from("profiles")
        .select("display_name")
        .eq("id", assignedByUserId)
        .single();
      if (assignerProfile) {
        assignerName = assignerProfile.display_name;
      }
    }

    const dedupeKey = generateDedupeKey("demand_assigned", demandId, userId);
    const notificationId = await saveNotification(
      userId,
      demandId,
      WTS_TEMPLATE_DEMAND_ASSIGNED,
      {
        demand_name: demand.name,
        assigner_name: assignerName,
      },
      dedupeKey
    );

    const linkUrl = `${APP_URL}/admin?demandId=${demandId}`;
    const result = await sendTemplateMessage({
      phone: profile.whatsapp_phone,
      templateId: WTS_TEMPLATE_DEMAND_ASSIGNED,
      variables: {
        assigner_name: assignerName, // Template usa nome do gestor
      },
      linkUrl,
    });

    if (result.ok) {
      await updateNotificationStatus(notificationId, "sent", result.messageId);
    } else {
      await updateNotificationStatus(
        notificationId,
        "failed",
        undefined,
        result.error
      );
    }
  } catch (err) {
    console.error("[notifications] Demand assigned error:", err);
  }
}

/**
 * Send manager comment notification
 */
export async function sendManagerCommentNotification(
  demandId: string,
  userId: string,
  managerUserId?: string,
  commentPreview?: string
): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("whatsapp_phone, whatsapp_opt_in")
      .eq("id", userId)
      .single();

    if (!profile || !profile.whatsapp_opt_in || !profile.whatsapp_phone) {
      return;
    }

    const { data: demand } = await admin
      .from("demands")
      .select("name")
      .eq("id", demandId)
      .single();

    if (!demand) {
      return;
    }

    // Buscar nome do gestor que comentou
    let managerName = "Gestor";
    if (managerUserId) {
      const { data: managerProfile } = await admin
        .from("profiles")
        .select("display_name")
        .eq("id", managerUserId)
        .single();
      if (managerProfile) {
        managerName = managerProfile.display_name;
      }
    }

    const dedupeKey = generateDedupeKey("manager_comment", demandId, userId);
    const notificationId = await saveNotification(
      userId,
      demandId,
      WTS_TEMPLATE_MANAGER_COMMENT,
      {
        demand_name: demand.name,
        manager_name: managerName,
      },
      dedupeKey
    );

    const linkUrl = `${APP_URL}/admin?demandId=${demandId}`;
    const result = await sendTemplateMessage({
      phone: profile.whatsapp_phone,
      templateId: WTS_TEMPLATE_MANAGER_COMMENT,
      variables: {
        manager_name: managerName, // Template usa nome do gestor conforme terminal
      },
      linkUrl,
    });

    if (result.ok) {
      await updateNotificationStatus(notificationId, "sent", result.messageId);
    } else {
      await updateNotificationStatus(
        notificationId,
        "failed",
        undefined,
        result.error
      );
    }
  } catch (err) {
    console.error("[notifications] Manager comment error:", err);
  }
}

/**
 * Send deadline soon notification
 */
export async function sendDeadlineSoonNotification(
  demandId: string,
  userId: string,
  hoursUntilDeadline: number
): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("whatsapp_phone, whatsapp_opt_in")
      .eq("id", userId)
      .single();

    if (!profile || !profile.whatsapp_opt_in || !profile.whatsapp_phone) {
      return;
    }

    const { data: demand } = await admin
      .from("demands")
      .select("name, due_at")
      .eq("id", demandId)
      .single();

    if (!demand || !demand.due_at) {
      return;
    }

    // Converter horas para dias (arredondado)
    const daysUntilDeadline = Math.ceil(hoursUntilDeadline / 24);

    const dedupeKey = generateDedupeKey(
      "deadline_soon",
      demandId,
      userId,
      `${daysUntilDeadline}d`
    );
    const notificationId = await saveNotification(
      userId,
      demandId,
      WTS_TEMPLATE_DEADLINE_SOON,
      {
        demand_name: demand.name,
        DIAS: daysUntilDeadline.toString(), // Template usa [DIAS]
      },
      dedupeKey
    );

    const linkUrl = `${APP_URL}/admin?demandId=${demandId}`;
    const result = await sendTemplateMessage({
      phone: profile.whatsapp_phone,
      templateId: WTS_TEMPLATE_DEADLINE_SOON,
      variables: {
        DIAS: daysUntilDeadline.toString(), // Template usa [DIAS] conforme terminal
      },
      linkUrl,
    });

    if (result.ok) {
      await updateNotificationStatus(notificationId, "sent", result.messageId);
    } else {
      await updateNotificationStatus(
        notificationId,
        "failed",
        undefined,
        result.error
      );
    }
  } catch (err) {
    console.error("[notifications] Deadline soon error:", err);
  }
}

/**
 * Get user notifications
 */
export async function getMyNotifications(): Promise<
  | {
      ok: true;
      data: Array<{
        id: string;
        demand_id: string | null;
        demand_name?: string;
        template_id: string;
        status: string;
        created_at: string;
        read_at: string | null;
        payload: Record<string, any> | null;
      }>;
    }
  | { ok: false; error: string }
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        ok: false,
        error: "Não autenticado",
      };
    }

    // Buscar notificações do usuário
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select(
        "id, demand_id, template_id, status, created_at, payload, read_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return {
        ok: false,
        error: `Erro ao buscar notificações: ${error.message}`,
      };
    }

    // Buscar nomes das demandas
    const demandIds = notifications
      ?.filter((n) => n.demand_id)
      .map((n) => n.demand_id) || [];

    let demandsMap = new Map<string, string>();
    if (demandIds.length > 0) {
      const { data: demands } = await supabase
        .from("demands")
        .select("id, name")
        .in("id", demandIds);

      if (demands) {
        demandsMap = new Map(demands.map((d) => [d.id, d.name]));
      }
    }

    const notificationsWithDemandNames = (notifications || []).map((n) => ({
      id: n.id,
      demand_id: n.demand_id,
      demand_name: n.demand_id ? demandsMap.get(n.demand_id) : undefined,
      template_id: n.template_id,
      status: n.status,
      created_at: n.created_at,
      read_at: n.read_at,
      payload: (n.payload as Record<string, any>) || null,
    }));

    return {
      ok: true,
      data: notificationsWithDemandNames,
    };
  } catch (err) {
    console.error("Get notifications error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao buscar notificações",
    };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        ok: false,
        error: "Não autenticado",
      };
    }

    // Verificar se a notificação pertence ao usuário
    const { data: notification } = await supabase
      .from("notifications")
      .select("user_id")
      .eq("id", notificationId)
      .single();

    if (!notification || notification.user_id !== user.id) {
      return {
        ok: false,
        error: "Notificação não encontrada ou sem permissão",
      };
    }

    // Atualizar read_at usando admin client para garantir que funcione mesmo sem política de UPDATE
    // (o usuário já foi verificado acima, então é seguro)
    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", user.id); // Garantir que só atualiza se for do usuário

    if (updateError) {
      console.error("[notifications] Erro ao atualizar read_at:", updateError);
      return {
        ok: false,
        error: `Erro ao marcar notificação como lida: ${updateError.message}`,
      };
    }

    return {
      ok: true,
    };
  } catch (err) {
    console.error("Mark notification as read error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao marcar notificação como lida",
    };
  }
}
