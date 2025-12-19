"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server Action: Gerar signed URL para visualização de anexo
 * Apenas para usuários autenticados
 *
 * Usa admin client para criar signed URLs pois bypassa RLS e garante
 * que funcionará independente das políticas de storage configuradas
 */
export async function getSignedAttachmentUrl(
  path: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
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
        error: "Unauthorized",
      };
    }

    // Validar que o path não está vazio
    if (!path || path.trim() === "") {
      return {
        ok: false,
        error: "Caminho do arquivo inválido",
      };
    }

    // Normalizar path: remover prefixo "demand-uploads/" se existir
    // O path salvo no banco deve ser apenas "{demandId}/{filename}"
    let normalizedPath = path.trim();
    if (normalizedPath.startsWith("demand-uploads/")) {
      normalizedPath = normalizedPath.replace(/^demand-uploads\//, "");
    }

    // Remover barras duplicadas e barras iniciais/finais
    normalizedPath = normalizedPath
      .replace(/\/+/g, "/")
      .replace(/^\/|\/$/g, "");

    // Usar admin client para criar signed URL (bypassa RLS)
    // Isso garante que funcionará mesmo se as políticas de storage não estiverem configuradas corretamente
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.storage
      .from("demand-uploads")
      .createSignedUrl(normalizedPath, 300); // 300 segundos = 5 minutos

    if (error) {
      console.error("[getSignedAttachmentUrl] Signed URL error:", error);

      // Verificar se o erro é "not found"
      if (
        error.message?.includes("not found") ||
        error.message?.includes("Object not found")
      ) {
        return {
          ok: false,
          error: "Attachment not found",
        };
      }

      return {
        ok: false,
        error: `Erro ao gerar URL: ${error.message || "Erro desconhecido"}`,
      };
    }

    if (!data?.signedUrl) {
      console.error("[getSignedAttachmentUrl] No signed URL returned in data");
      return {
        ok: false,
        error: "Não foi possível gerar URL do arquivo",
      };
    }

    return {
      ok: true,
      url: data.signedUrl,
    };
  } catch (err) {
    console.error("[getSignedAttachmentUrl] Unexpected error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao gerar URL.",
    };
  }
}
