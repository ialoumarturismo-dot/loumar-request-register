"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database";

type Demand = Database["public"]["Tables"]["demands"]["Row"];

// Função para normalizar URLs adicionando https:// se necessário
const normalizeUrl = (url: string): string => {
  if (!url || url.trim() === "") return url;

  const trimmed = url.trim();

  // Se já tem protocolo (http://, https://, ftp://, etc.), retorna como está
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) {
    return trimmed;
  }

  // Remove barras iniciais se houver
  const cleaned = trimmed.replace(/^\/+/, "");

  // Se parece ser uma URL válida (contém ponto e caracteres válidos)
  // Padrão: começa com letra/número, pode ter hífens/pontos, tem domínio válido
  if (/^[a-zA-Z0-9][a-zA-Z0-9\-.]*\.[a-zA-Z]{2,}/.test(cleaned)) {
    return `https://${cleaned}`;
  }

  // Se começa com www., adiciona https://
  if (/^www\./i.test(cleaned)) {
    return `https://${cleaned}`;
  }

  // Se não parece ser URL, retorna como está (será validado depois)
  return trimmed;
};

// Schema de validação para criação de demanda
const createDemandSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  department: z.string().min(2, "Setor deve ter pelo menos 2 caracteres"),
  demand_type: z.enum(["Bug", "Melhoria", "Ideia", "Ajuste"]),
  system_area: z
    .string()
    .min(2, "Sistema/área deve ter pelo menos 2 caracteres"),
  impact_level: z.enum(["Bloqueante", "Alto", "Médio", "Baixo"]),
  description: z
    .string()
    .min(10, "Descrição deve ter pelo menos 10 caracteres"),
  reference_links: z
    .array(
      z
        .string()
        .transform((val) => normalizeUrl(val))
        .pipe(z.string().url())
    )
    .optional()
    .default([]),
});

type CreateDemandInput = z.infer<typeof createDemandSchema>;

export async function createDemand(formData: FormData) {
  try {
    // Extrair campos do FormData
    const name = formData.get("name") as string;
    const department = formData.get("department") as string;
    const demand_type = formData.get("demand_type") as string;
    const system_area = formData.get("system_area") as string;
    const impact_level = formData.get("impact_level") as string;
    const description = formData.get("description") as string;
    const referenceLinksJson = formData.get("reference_links") as string | null;

    // Extrair múltiplos arquivos
    const attachments: File[] = [];
    const attachmentsData = formData.getAll("attachments");
    attachmentsData.forEach((item) => {
      if (item instanceof File && item.size > 0) {
        attachments.push(item);
      }
    });

    // Processar links de referência
    let referenceLinks: string[] = [];
    if (referenceLinksJson) {
      try {
        referenceLinks = JSON.parse(referenceLinksJson);
      } catch (e) {
        console.error("Error parsing reference_links:", e);
        // Continuar com array vazio se houver erro
      }
    }

    // Validar campos obrigatórios
    const validation = createDemandSchema.safeParse({
      name,
      department,
      demand_type,
      system_area,
      impact_level,
      description,
      reference_links: referenceLinks,
    });

    if (!validation.success) {
      return {
        ok: false,
        error: validation.error.issues[0]?.message || "Dados inválidos",
      };
    }

    const validatedData = validation.data;

    // Gerar ID da demanda antes do upload (para organizar arquivos)
    const demandId = randomUUID();

    const attachmentUrls: string[] = [];

    // Processar upload de múltiplos arquivos
    if (attachments.length > 0) {
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];

      const supabase = createAdminClient();

      for (const attachment of attachments) {
        try {
          // Validar tamanho
          if (attachment.size > MAX_SIZE) {
            return {
              ok: false,
              error: `${attachment.name}: Arquivo muito grande. Tamanho máximo: 5MB`,
            };
          }

          // Validar tipo de arquivo
          if (!allowedTypes.includes(attachment.type)) {
            return {
              ok: false,
              error: `${attachment.name}: Tipo não permitido. Use apenas imagens (JPG, PNG, GIF, WEBP)`,
            };
          }

          // Sanitizar nome do arquivo
          const sanitizedFilename = attachment.name
            .replace(/[^a-zA-Z0-9.-]/g, "_")
            .toLowerCase();

          // Definir path no storage: demand-uploads/{demandId}/{filename}
          const storagePath = `${demandId}/${sanitizedFilename}`;

          // Converter File para ArrayBuffer
          const arrayBuffer = await attachment.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Fazer upload
          const { error: uploadError } = await supabase.storage
            .from("demand-uploads")
            .upload(storagePath, buffer, {
              contentType: attachment.type,
              upsert: false,
            });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            return {
              ok: false,
              error: `Erro ao fazer upload de ${attachment.name}: ${uploadError.message}`,
            };
          }

          // Adicionar path ao array
          attachmentUrls.push(storagePath);
        } catch (uploadErr) {
          console.error("Upload exception:", uploadErr);
          return {
            ok: false,
            error: `Erro ao processar ${attachment.name}. Tente novamente.`,
          };
        }
      }
    }

    // Inserir demanda no banco
    try {
      const supabase = createAdminClient();
      // Calcular prioridade inicial
      const priorityScore = calculatePriorityScore(
        validatedData.impact_level,
        validatedData.demand_type,
        new Date()
      );

      const { data, error } = await supabase
        .from("demands")
        .insert({
          id: demandId,
          name: validatedData.name,
          department: validatedData.department,
          demand_type: validatedData.demand_type,
          system_area: validatedData.system_area,
          impact_level: validatedData.impact_level,
          description: validatedData.description,
          attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : [],
          reference_links: validatedData.reference_links || [],
          status: "Recebido",
          admin_status: "Em análise",
          priority_score: priorityScore,
        })
        .select()
        .single();

      if (error) {
        console.error("Insert error:", error);
        return {
          ok: false,
          error: `Erro ao criar demanda: ${error.message}`,
        };
      }

      return {
        ok: true,
        id: data.id,
      };
    } catch (insertErr) {
      console.error("Insert exception:", insertErr);
      return {
        ok: false,
        error: "Erro ao salvar demanda. Tente novamente.",
      };
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      ok: false,
      error: "Erro inesperado. Tente novamente mais tarde.",
    };
  }
}

/**
 * Server Action: Listar todas as demandas (apenas para usuários autenticados)
 */
export async function getDemands(): Promise<
  { ok: true; data: Demand[] } | { ok: false; error: string }
> {
  try {
    const supabase = await createClient();

    // Verificar se usuário está autenticado
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

    // Buscar demandas ordenadas por data (mais recente primeiro)
    const { data, error } = await supabase
      .from("demands")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get demands error:", error);
      return {
        ok: false,
        error: `Erro ao buscar demandas: ${error.message}`,
      };
    }

    return {
      ok: true,
      data: data || [],
    };
  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao buscar demandas.",
    };
  }
}

/**
 * Função para calcular score de prioridade (0-100)
 * Função auxiliar interna - não é uma server action
 */
function calculatePriorityScore(
  impactLevel: string,
  demandType: string,
  createdAt: Date
): number {
  // Baseado no impacto (40% do score)
  const impactScores: Record<string, number> = {
    Bloqueante: 100,
    Alto: 75,
    Médio: 50,
    Baixo: 25,
  };
  const impactScore = impactScores[impactLevel] || 50;

  // Baseado no tipo (20% do score)
  const typeScores: Record<string, number> = {
    Bug: 20,
    Melhoria: 10,
    Ideia: 5,
    Ajuste: 15,
  };
  const typeScore = typeScores[demandType] || 10;

  // Baseado na idade (20% do score) - demandas mais antigas ganham prioridade
  const daysSinceCreation =
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const ageScore = Math.min(20, Math.floor(daysSinceCreation / 7) * 5); // +5 pontos por semana, máximo 20

  // Cálculo final: (impacto × 0.4) + (tipo × 0.2) + (idade × 0.2) + base (20)
  const finalScore = Math.round(
    impactScore * 0.4 + typeScore * 0.2 + ageScore * 0.2 + 20
  );

  return Math.min(100, Math.max(0, finalScore));
}

/**
 * Server Action: Atualizar status de uma demanda
 */
const updateStatusSchema = z.object({
  status: z.enum(["Recebido", "Em análise", "Em execução", "Concluído"]),
});

export async function updateDemandStatus(
  demandId: string,
  status: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();

    // Verificar se usuário está autenticado
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

    // Validar status
    const validation = updateStatusSchema.safeParse({ status });
    if (!validation.success) {
      return {
        ok: false,
        error: validation.error.issues[0]?.message || "Status inválido",
      };
    }

    // Atualizar apenas o campo status
    const { error: updateError } = await supabase
      .from("demands")
      .update({ status: validation.data.status })
      .eq("id", demandId);

    if (updateError) {
      console.error("Update status error:", updateError);
      return {
        ok: false,
        error: `Erro ao atualizar status: ${updateError.message}`,
      };
    }

    // Revalidar página do admin para refletir mudanças
    revalidatePath("/admin");

    return {
      ok: true,
    };
  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao atualizar status.",
    };
  }
}

/**
 * Server Action: Atualizar admin_status de uma demanda
 */
const updateAdminStatusSchema = z.object({
  admin_status: z.enum(["Em análise", "Acatada", "Resolvida", "Descartada"]),
});

export async function updateAdminStatus(
  demandId: string,
  adminStatus: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();

    // Verificar se usuário está autenticado
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

    // Validar admin_status
    const validation = updateAdminStatusSchema.safeParse({
      admin_status: adminStatus,
    });
    if (!validation.success) {
      return {
        ok: false,
        error:
          validation.error.issues[0]?.message ||
          "Status administrativo inválido",
      };
    }

    // Preparar update
    const updateData: {
      admin_status: string;
      resolved_at?: string;
    } = {
      admin_status: validation.data.admin_status,
    };

    // Se foi resolvida, adicionar timestamp
    if (validation.data.admin_status === "Resolvida") {
      updateData.resolved_at = new Date().toISOString();
    }

    // Atualizar admin_status
    const { error: updateError } = await supabase
      .from("demands")
      .update(updateData)
      .eq("id", demandId);

    if (updateError) {
      console.error("Update admin status error:", updateError);
      return {
        ok: false,
        error: `Erro ao atualizar status administrativo: ${updateError.message}`,
      };
    }

    // Revalidar página do admin
    revalidatePath("/admin");

    return {
      ok: true,
    };
  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao atualizar status administrativo.",
    };
  }
}

/**
 * Server Action: Atualizar admin_notes de uma demanda
 */
export async function updateAdminNotes(
  demandId: string,
  adminNotes: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();

    // Verificar se usuário está autenticado
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

    // Atualizar admin_notes (permite string vazia)
    const { error: updateError } = await supabase
      .from("demands")
      .update({ admin_notes: adminNotes || null })
      .eq("id", demandId);

    if (updateError) {
      console.error("Update admin notes error:", updateError);
      return {
        ok: false,
        error: `Erro ao atualizar notas: ${updateError.message}`,
      };
    }

    // Revalidar página do admin
    revalidatePath("/admin");

    return {
      ok: true,
    };
  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao atualizar notas.",
    };
  }
}

/**
 * Server Action: Atualizar assigned_to de uma demanda
 */
export async function updateAssignedTo(
  demandId: string,
  assignedTo: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();

    // Verificar se usuário está autenticado
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

    // Atualizar assigned_to
    const { error: updateError } = await supabase
      .from("demands")
      .update({ assigned_to: assignedTo || null })
      .eq("id", demandId);

    if (updateError) {
      console.error("Update assigned_to error:", updateError);
      return {
        ok: false,
        error: `Erro ao atualizar responsável: ${updateError.message}`,
      };
    }

    // Revalidar página do admin
    revalidatePath("/admin");

    return {
      ok: true,
    };
  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao atualizar responsável.",
    };
  }
}

/**
 * Server Action: Atualizar priority de uma demanda
 */
const updatePrioritySchema = z.object({
  priority: z.enum(["Urgente", "Importante", "Necessário", "Interessante"]),
});

export async function updatePriority(
  demandId: string,
  priority: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();

    // Verificar se usuário está autenticado
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

    // Validar priority
    const validation = updatePrioritySchema.safeParse({
      priority: priority,
    });
    if (!validation.success) {
      return {
        ok: false,
        error: validation.error.issues[0]?.message || "Prioridade inválida",
      };
    }

    // Atualizar priority
    const { error: updateError } = await supabase
      .from("demands")
      .update({ priority: validation.data.priority })
      .eq("id", demandId);

    if (updateError) {
      console.error("Update priority error:", updateError);
      return {
        ok: false,
        error: `Erro ao atualizar prioridade: ${updateError.message}`,
      };
    }

    // Revalidar página do admin
    revalidatePath("/admin");

    return {
      ok: true,
    };
  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao atualizar prioridade.",
    };
  }
}

/**
 * Server Action: Deletar uma demanda
 */
export async function deleteDemand(
  demandId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // Primeiro: garantir que há um usuário autenticado (rota /admin)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Não autenticado" };
    }

    /**
     * IMPORTANTE:
     * A tabela `demands` tem RLS ativo e (por design) NÃO tem policy de DELETE.
     * Logo, deletar usando o client "normal" pode resultar em 0 linhas afetadas
     * sem erro. Para o painel admin, usamos o service_role (server-side).
     */
    const admin = createAdminClient();

    // Buscar anexos antes de deletar (para limpar storage)
    const { data: existing, error: existingError } = await admin
      .from("demands")
      .select("id, attachment_urls")
      .eq("id", demandId)
      .maybeSingle();

    if (existingError) {
      console.error("Fetch demand before delete error:", existingError);
      return {
        ok: false,
        error: `Erro ao buscar demanda: ${existingError.message}`,
      };
    }

    if (!existing?.id) {
      return { ok: false, error: "Demanda não encontrada" };
    }

    // Deletar anexos do Storage (best-effort; se falhar, ainda deletamos a demanda)
    const attachmentPaths =
      (existing as unknown as { attachment_urls?: string[] }).attachment_urls ||
      [];
    if (Array.isArray(attachmentPaths) && attachmentPaths.length > 0) {
      const { error: storageError } = await admin.storage
        .from("demand-uploads")
        .remove(attachmentPaths);

      if (storageError) {
        console.error("Delete storage objects error:", storageError);
      }
    }

    // Deletar demanda (confirmando linhas afetadas via select)
    const { data: deletedRows, error: deleteError } = await admin
      .from("demands")
      .delete()
      .eq("id", demandId)
      .select("id");

    if (deleteError) {
      console.error("Delete demand error:", deleteError);
      return {
        ok: false,
        error: `Erro ao deletar demanda: ${deleteError.message}`,
      };
    }

    if (!deletedRows || deletedRows.length === 0) {
      return {
        ok: false,
        error:
          "Não foi possível excluir a demanda (sem permissão de DELETE ou demanda não encontrada).",
      };
    }

    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao deletar demanda.",
    };
  }
}
