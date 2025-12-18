"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Server Action: Gerar signed URL para visualização de anexo
 * Apenas para usuários autenticados
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
        error: "Não autenticado",
      };
    }

    // Validar que o path não está vazio
    if (!path || path.trim() === "") {
      return {
        ok: false,
        error: "Caminho do arquivo inválido",
      };
    }

    // Gerar signed URL com expiração de 5 minutos
    const { data, error } = await supabase.storage
      .from("demand-uploads")
      .createSignedUrl(path, 300); // 300 segundos = 5 minutos

    if (error) {
      console.error("Signed URL error:", error);
      return {
        ok: false,
        error: `Erro ao gerar URL: ${error.message}`,
      };
    }

    if (!data?.signedUrl) {
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
    console.error("Unexpected error:", err);
    return {
      ok: false,
      error: "Erro inesperado ao gerar URL.",
    };
  }
}
