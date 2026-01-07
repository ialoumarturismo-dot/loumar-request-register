/**
 * WhatsApp client for flwchat/wts.chat API
 * Documentation: https://flwchat.readme.io/reference/post_v1-message-send
 */

interface SendTemplateMessageParams {
  phone: string; // E.164 format (e.g., +5511999999999)
  templateId: string;
  variables?: Record<string, string>;
  linkUrl?: string;
}

interface FlwchatResponse {
  id?: string;
  status?: string;
  error?: string;
  message?: string;
}

/**
 * Send WhatsApp template message via flwchat API
 */
export async function sendTemplateMessage(
  params: SendTemplateMessageParams
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  try {
    // API flwchat usa api.wts.chat conforme documentação
    const baseUrl = process.env.WTS_BASE_URL || "https://api.wts.chat";
    const apiToken = process.env.WTS_TOKEN;
    const channelFrom = process.env.WTS_CHANNEL_FROM || "4535214014"; // Canal de envio padrão

    if (!apiToken) {
      console.error("[flwchat] WTS_TOKEN não configurado");
      return {
        ok: false,
        error: "WTS_TOKEN não configurado",
      };
    }

    // Normalize phone number (remove spaces and + prefix for API)
    // A API espera o formato sem + (ex: 45988230845)
    let normalizedPhone = params.phone.replace(/\s+/g, "").replace(/^\+/, "");

    // Build payload according to flwchat API documentation
    // Formato esperado conforme teste manual:
    // {
    //   "body": {
    //     "templateId": "..."
    //   },
    //   "to": "45988230845",
    //   "from": "4535214014"
    // }
    const payload: any = {
      body: {
        templateId: params.templateId,
      },
      to: normalizedPhone,
      from: channelFrom,
    };

    // Add variables to body if provided
    if (params.variables && Object.keys(params.variables).length > 0) {
      payload.body.variables = params.variables;
    }

    // Add linkUrl to body if provided
    if (params.linkUrl) {
      payload.body.linkUrl = params.linkUrl;
    }

    // Normalize base URL (remove trailing slash)
    const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
    const apiUrl = `${normalizedBaseUrl}/chat/v1/message/send`;

    console.log("[flwchat] Sending message:", {
      url: apiUrl,
      to: normalizedPhone,
      from: channelFrom,
      templateId: params.templateId,
      hasVariables:
        !!params.variables && Object.keys(params.variables).length > 0,
      hasLink: !!params.linkUrl,
      payload: JSON.stringify(payload, null, 2),
    });

    // API usa token direto sem Bearer prefix conforme teste manual
    let response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiToken,
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP ${response.status}` };
      }

      console.error("[flwchat] Error response:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });

      return {
        ok: false,
        error:
          errorData.message ||
          errorData.error ||
          `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const responseText = await response.text();
    let data: FlwchatResponse;
    try {
      data = JSON.parse(responseText);
    } catch (err) {
      console.error("[flwchat] Failed to parse response:", responseText);
      return {
        ok: false,
        error: "Resposta inválida da API",
      };
    }

    if (data.error) {
      console.error("[flwchat] API returned error:", data.error);
      return {
        ok: false,
        error: data.error,
      };
    }

    // Extract message ID from response
    const messageId = data.id || data.status || "unknown";

    console.log("[flwchat] Message sent successfully:", {
      messageId,
      response: data,
    });

    return {
      ok: true,
      messageId,
    };
  } catch (err) {
    console.error("[flwchat] Send message error:", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Erro desconhecido ao enviar mensagem",
    };
  }
}

/**
 * Generate dedupe key for notifications
 */
export function generateDedupeKey(
  eventType: string,
  demandId: string,
  userId: string,
  bucket?: string
): string {
  const parts = [eventType, demandId, userId];
  if (bucket) {
    parts.push(bucket);
  }
  return parts.join(":");
}
