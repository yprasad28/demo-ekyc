import { decentroConfig } from "@/lib/config/decentro";

export interface DecentroApiResponse {
  referenceId?: string;
  kycStatus: string;
  status: string;
  message?: string;
  error?: { message: string; responseCode: string };
  result?: Record<string, unknown>;
  data?: Record<string, unknown>;
  responseKey?: string;
  responseCode?: string;
  requestTimestamp?: string;
  responseTimestamp?: string;
  decentroTxnId?: string;
}

export async function decentroRequest(
  path: string,
  body: Record<string, unknown>
): Promise<DecentroApiResponse> {
  const url = `${decentroConfig.baseUrl}${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      client_id: decentroConfig.clientId,
      client_secret: decentroConfig.clientSecret,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  const contentType = response.headers.get("content-type") || "";
  let json;
  if (contentType.includes("application/json")) {
    json = await response.json();
  } else {
    const text = await response.text();
    console.error(`[Decentro] Non-JSON response (${response.status}):`, text.substring(0, 500));
    throw new Error(`Decentro API returned non-JSON response (HTTP ${response.status}). Service may be unavailable or IP-restricted.`);
  }

  console.log(`[Decentro] ${path} → ${response.status}`, JSON.stringify(json, null, 2));

  if (!response.ok) {
    const errorMsg = json.error?.message || json.message || "Unknown error";
    throw new Error(
      `Decentro API error ${response.status}: ${errorMsg}`
    );
  }

  return json;
}
